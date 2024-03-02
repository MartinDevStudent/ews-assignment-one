
type HttpResponse = {
    statusCode: number;
    headers: { [key: string]: string };
    body: string;
};

export function NotFound(message: string): HttpResponse {
    return {
        statusCode: 404,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ Message: message }),
    };
}

export function Ok(data: any): HttpResponse {
    return {
        statusCode: 200,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ data: data }),
    };
}

export function ServerError(error: any): HttpResponse {
    return {
        statusCode: 500,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ error }),
    };
}