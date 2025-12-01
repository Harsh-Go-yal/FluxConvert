import axios, {
    type AxiosInstance,
    type InternalAxiosRequestConfig
} from 'axios';
import FormData = require('form-data');

import { HttpException, HttpStatus, Logger } from '@nestjs/common';

export abstract class BaseClient {
    protected readonly axiosInstance: AxiosInstance;
    protected readonly logger: Logger;

    constructor(baseURL: string, serviceName: string) {
        this.logger = new Logger(serviceName);

        this.axiosInstance = axios.create({
            baseURL,
            timeout: 10000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        // Log all outgoing requests
        this.axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                this.logger.log(`Sending request to ${config.url}`);
                return config;
            }
        );
    }

    // -----------------------------------------------------
    // ✔ FIXED: Proper file upload + binary response support
    // -----------------------------------------------------
    protected async postFile(
        endpoint: string,
        fileBuffer: Buffer,
        filename: string,
        additionalFields: Record<string, any> = {}
    ): Promise<any> {
        const formData = new FormData();

        // MOST IMPORTANT: use raw Buffer (do NOT use Blob)
        formData.append('file', fileBuffer, filename);

        // Append additional fields
        for (const [key, value] of Object.entries(additionalFields)) {
            formData.append(key, value);
        }

        const headers = formData.getHeaders();

        // RETURN BINARY DATA (arraybuffer) — FIX FOR WHITE PDF
        return this.requestWithRetry(() =>
            this.axiosInstance.post(endpoint, formData, {
                headers,
                responseType: 'arraybuffer',   // 🔥 REQUIRED
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            })
        );
    }

    // -----------------------------------------------------
    // Retry wrapper with exponential backoff
    // -----------------------------------------------------
    protected async requestWithRetry<T>(
        requestFn: () => Promise<T>,
        retries = 3,
        delay = 1000
    ): Promise<T> {
        try {
            return await requestFn();
        } catch (error: any) {
            if (retries > 0) {
                this.logger.warn(
                    `Request failed, retrying... (${retries} attempts left). Error: ${error.message}`
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.requestWithRetry(requestFn, retries - 1, delay * 2);
            }

            return this.handleError(error);
        }
    }

    // -----------------------------------------------------
    // Centralized Error Handling
    // -----------------------------------------------------
    private handleError(error: any): never {
        this.logger.error(`Microservice call failed: ${error.message}`);

        if (error.response) {
            throw new HttpException(
                error.response.data ?? 'Microservice error',
                error.response.status ?? HttpStatus.BAD_GATEWAY
            );
        }

        if (error.request) {
            throw new HttpException(
                'Microservice unreachable',
                HttpStatus.GATEWAY_TIMEOUT
            );
        }

        throw new HttpException(
            'Internal server error',
            HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}
