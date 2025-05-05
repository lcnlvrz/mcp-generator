'use client'
import { FileUploadForm } from '@/components/file-upload-form'
import { Dropzone } from '@/components/ui/upload/dropzone'
import {
  UploaderProvider,
  UploadFn,
} from '@/components/upload/uploader-provider'
import { useEdgeStore } from '@/lib/edgestore'
import { GenerateMCPServerRequestBody } from '@/lib/schema'
import * as React from 'react'

export default function DropzoneExample() {
  return (
    <main className='container mx-auto py-10 px-4 md:px-6 lg:px-8 min-h-screen flex flex-col items-center justify-center'>
      <div className='max-w-3xl w-full space-y-6'>
        <div className='text-center space-y-2'>
          <h1 className='text-3xl font-bold tracking-tight'>MCP Generator</h1>
          <p className='text-muted-foreground text-stone-500'>
            Upload your OpenAPI specification (JSON or YAML) and get a generated
            MCP Server
          </p>
        </div>
        <FileUploadForm />
      </div>
    </main>
  )
}
