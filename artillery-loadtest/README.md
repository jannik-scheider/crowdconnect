## Artillery Load Testing

This folder contains all relevant files for load testing the live chat application using [Artillery](https://www.artillery.io/). The goal of the tests is to evaluate the scalability and performance of the WebSocket backend.

### Folder Structure

- **`test-cases/`** – Contains Artillery scripts for load test configuration.
- **`results/`** – Stores the results of the load tests.
- **`data-analysis/`** – Analysis of test results.

### Setup & Installation

1. Install all packages (if not already installed):

   ```sh
   npm install
   ```

2. Start a test run using one of the provided configurations:

   ```sh
    artillery run test-cases/load-test.yml
   ```
