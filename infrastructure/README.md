# Infrastructure as Code (IaC) with Terraform

This folder contains all Terraform code required to provision and manage the cloud infrastructure for crowdconnect.

## Prerequisites

Ensure you have the following installed:

- [Terraform](https://developer.hashicorp.com/terraform/downloads)
- [AWS CLI](https://aws.amazon.com/cli/) (if deploying to AWS)
- Appropriate cloud provider credentials configured (e.g., AWS, Azure, GCP)

## Setup & Usage

1. Initialize Terraform (download necessary providers and modules):

   ```sh
   terraform init
   ```

2. Preview the infrastructure changes:

   ```sh
   terraform plan
   ```

3. Apply the changes to provision the infrastructure:

   ```sh
   terraform apply
   ```

4. If needed, destroy the infrastructure:

   ```sh
   terraform destroy
   ```
