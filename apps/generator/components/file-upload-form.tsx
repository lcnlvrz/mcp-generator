'use client'

import React from 'react'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  Upload,
  FileCode,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { generateSdk } from '@/lib/actions'
import { cn } from '@/lib/utils'
import { Dropzone } from './ui/upload/dropzone'
import { UploaderProvider, UploadFn } from './upload/uploader-provider'
import { useEdgeStore } from '@/lib/edgestore'
import { GenerateMCPServerRequestBody } from '@/lib/schema'

export function FileUploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkCode, setSdkCode] = useState<string | null>(null)
  const [language, setLanguage] = useState<string>('typescript')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (
      fileExtension !== 'json' &&
      fileExtension !== 'yaml' &&
      fileExtension !== 'yml'
    ) {
      setError('Please upload a JSON or YAML file')
      setFile(null)
      return
    }

    setFile(selectedFile)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setIsLoading(true)
    setError(null)
    setSdkCode(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('language', language)

      const result = await generateSdk(formData)

      if (result.error) {
        setError(result.error)
      } else if (result.code) {
        setSdkCode(result.code)
      }
    } catch (err) {
      setError('An error occurred while generating the MCP Server')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSdk = () => {
    if (!sdkCode) return

    const blob = new Blob([sdkCode], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api-client.${language === 'typescript' ? 'ts' : 'js'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const { edgestore } = useEdgeStore()

  const uploadFn: UploadFn = React.useCallback(
    async ({ file, onProgressChange, signal }) => {
      setIsLoading(true)

      const res = await edgestore.publicFiles.upload({
        file,
        signal,
        onProgressChange,
      })

      const response = await fetch('/api/generate-mcp', {
        method: 'POST',
        body: JSON.stringify({
          specURL: res.url,
        } satisfies GenerateMCPServerRequestBody),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const mcpServerFile = await response.text()

      setSdkCode(mcpServerFile)

      setIsLoading(false)
      return res
    },
    [edgestore]
  )

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle>Upload OpenAPI Specification</CardTitle>
        <CardDescription className='text-xs text-stone-500'>
          Upload your OpenAPI JSON or YAML file to generate an MCP Server client
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div className='space-y-2'>
            <Label className='text-xs' htmlFor='file'>
              OpenAPI Specification (.json or .yaml)
            </Label>

            <UploaderProvider uploadFn={uploadFn} autoUpload>
              <Dropzone
                className='border-stone-300'
                dropzoneOptions={{
                  maxFiles: 1,
                  maxSize: 1024 * 1024 * 10,
                  accept: {
                    'yaml/*': ['.yaml', '.yml'],
                    'json/*': ['.json'],
                  },
                }}
              />
            </UploaderProvider>
          </div>

          {error && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type='submit'
            className='w-full'
            disabled={isLoading || !file}
          >
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Generating MCP Server...
              </>
            ) : (
              <>
                <FileCode className='mr-2 h-4 w-4' />
                Generate MCP Server
              </>
            )}
          </Button>
        </form>

        {sdkCode && (
          <div className='mt-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-medium'>Generated MCP Server</h3>
              <Button variant='outline' size='sm' onClick={downloadSdk}>
                <Download className='mr-2 h-4 w-4' />
                Download
              </Button>
            </div>
            <div className='relative'>
              <pre className='bg-muted p-4 rounded-lg overflow-auto max-h-[400px] text-sm'>
                <code>{sdkCode}</code>
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
