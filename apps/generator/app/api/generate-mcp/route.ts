'use server'

import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import fs from 'fs'
import path from 'path'
import { generateMCPServerRequestBody } from '@/lib/schema'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

console.log('reading mcp llm txt', path.join(__dirname, 'mcp-llm.txt'))

const response = await fetch('https://modelcontextprotocol.io/llms-full.txt')
const mcpDocs = await response.text()

const systemPrompt = `You are a helpful assistant expert in creating mcp servers based on open api specification (either in json or yaml format). Your task is to help users to generate an mcp server strongly typed in a single index.ts file that is configured to be deployed anywhere. Here you have all the knoweldge required to known what the fuck is MCP:\n\n${mcpDocs}\n You must return only the content of the index.ts file, don't include any other text or comments. The file must be valid typescript code.`

console.log(`Compiled system prompt: ${systemPrompt}`)

const generateMCP = async ({ body }: { body: any }) => {
  const bodyParsed = generateMCPServerRequestBody.safeParse(body)

  if (!bodyParsed.success)
    return {
      error: `Invalid body`,
    }

  const { text, usage } = await generateText({
    model: google('gemini-2.5-pro-exp-03-25'),
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Here is the open api specification: ${bodyParsed.data.specURL}`,
      },
    ],
  })

  console.log('usage', usage)

  return {
    code: text,
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { code } = await generateMCP({ body })

  return new Response(code, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
