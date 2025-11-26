import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

export abstract class BaseClient {
    protected readonly axiosInstance: AxiosInstance;
    protected readonly logger: Logger;

    constructor(baseURL: string, serviceName: string) {
        this.logger = new Logger(serviceName);
        this.axiosInstance = axios.create({
            baseURL,
            timeout: 10000, // 10s timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        // Interceptor for logging
        this.axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            this.logger.log(`Sending request to ${config.url}`);
            return config;
        });
    }

    protected async postFile(endpoint: string, fileBuffer: Buffer, filename: string, additionalFields: Record<string, any> = {}): Promise<any> {
        const formData = new FormData();
        formData.append('file', fileBuffer, filename);

        for (const [key, value] of Object.entries(additionalFields)) {
            formData.append(key, value);
        }

        return this.requestWithRetry(() =>
            this.axiosInstance.post(endpoint, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            })
        );
    }

    protected async requestWithRetry<T>(requestFn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await requestFn();
        } catch (error) {
            if (retries > 0) {
                this.logger.warn(`Request failed, retrying... (${retries} attempts left). Error: ${error.message}`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.requestWithRetry(requestFn, retries - 1, delay * 2); // Exponential backoff
            } else {
                this.handleError(error);
            }
        }
    }

    private handleError(error: any): never {
        this.logger.error(`Microservice call failed: ${error.message}`);
        if (error.response) {
            throw new HttpException(
                error.response.data || 'Microservice error',
                error.response.status || HttpStatus.BAD_GATEWAY,
            );
        } else if (error.request) {
            throw new HttpException('Microservice unreachable', HttpStatus.GATEWAY_TIMEOUT);
        } else {
            throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
