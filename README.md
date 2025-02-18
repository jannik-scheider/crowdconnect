# CrowdConnect

CrowdConnect is a real-time live chat application built with **Socket.IO**, hosted on **AWS**, and managed using **Infrastructure as Code (IaC) with Terraform**. The application includes backend services, a frontend interface, and load testing with **Artillery**.

## Project Structure

- **`backend/`** – Contains the server-side logic using **Node.js** and **Socket.IO**.
- **`frontend/`** – React-based client application for users to interact with CrowdConnect.
- **`infrastructure/`** – Terraform configurations for provisioning AWS infrastructure.
- **`artillery-loadtest/`** – Scripts and configurations for **Artillery** load testing.

## Prerequisites

Before running the application, ensure you have:

- [Node.js](https://nodejs.org/) installed.
- [Terraform](https://developer.hashicorp.com/terraform/downloads) (if deploying infrastructure).
- A `.env` file with the required environment variables in both **backend/** and **frontend/**.

## Setup & Usage

### 1. Install Dependencies

Navigate to the respective folders and install required packages:

```sh
cd backend && npm install
cd ../frontend && npm install
```

### 2. Running the Application

start the backend:

```sh
cd backend
npm start
```

start the frontend:

```sh
cd frontend
npm run dev
```

Deploying the infrastructure is explained in more detail in the folder **`infrastructure/`**. The same applies for the loadtests in the folder **`artillery-loadtest/`**.
