"use server"

import { parse as parseYaml } from "yaml"
import OpenAPI from "openapi-typescript-codegen"
import path from "path"
import fs from "fs/promises"

export async function generateSdk(formData: FormData) {
  try {
    const file = formData.get("file") as File
    const language = formData.get("language") as string

    if (!file) {
      return { error: "No file provided" }
    }

    // Read file content
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileContent = fileBuffer.toString()

    // Parse the OpenAPI spec based on file type
    let openApiSpec
    const fileName = file.name.toLowerCase()

    try {
      if (fileName.endsWith(".json")) {
        openApiSpec = JSON.parse(fileContent)
      } else if (fileName.endsWith(".yaml") || fileName.endsWith(".yml")) {
        openApiSpec = parseYaml(fileContent)
      } else {
        return { error: "Unsupported file format. Please upload JSON or YAML." }
      }
    } catch (err) {
      return { error: "Failed to parse the file. Please ensure it's a valid OpenAPI specification." }
    }

    // Validate that it's an OpenAPI spec
    if (!openApiSpec.openapi && !openApiSpec.swagger) {
      return { error: "The file does not appear to be a valid OpenAPI specification." }
    }

    // Create a temporary directory for SDK generation
    // Use a directory within the project instead of os.tmpdir()
    const tempDirName = `temp-sdk-${Date.now()}`
    const tempDir = path.join(process.cwd(), tempDirName)

    try {
      await fs.mkdir(tempDir, { recursive: true })

      // Generate the SDK
      await OpenAPI.generate({
        input: openApiSpec,
        output: tempDir,
        exportCore: true,
        exportServices: true,
        exportModels: true,
        exportSchemas: false,
        useUnionTypes: true,
        useOptions: true,
        indent: "2",
        postfix: "Service",
        request: language === "typescript" ? "axios" : "fetch",
        httpClient: language === "typescript" ? "axios" : "fetch",
      })

      // Read the generated files
      const files = await fs.readdir(tempDir)

      // Find the main service file
      const serviceFile = files.find(
        (file) => file.includes("Service") && file.endsWith(language === "typescript" ? ".ts" : ".js"),
      )

      if (!serviceFile) {
        return { error: "Failed to generate SDK. No service file found." }
      }

      // Read the service file content
      const serviceFilePath = path.join(tempDir, serviceFile)
      const serviceFileContent = await fs.readFile(serviceFilePath, "utf-8")

      // Clean up the temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error("Failed to clean up temporary directory:", cleanupError)
      }

      // Return the generated code
      return { code: serviceFileContent }
    } catch (error) {
      // Clean up in case of error
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error("Failed to clean up temporary directory:", cleanupError)
      }
      throw error
    }
  } catch (error) {
    console.error("SDK generation error:", error)
    return { error: "An error occurred while generating the SDK" }
  }
}
