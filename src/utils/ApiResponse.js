class ApiResponse {
    constructor(statusCode, data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400
        this.status = this.success ? "success" : "error";
        this.timestamp = new Date().toISOString();
        if (meta) this.meta = meta;
    }
}

export { ApiResponse }