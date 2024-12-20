# 1. ECR Repository erstellen
resource "aws_ecr_repository" "live_chat_repo" {
  name = "live-chat-app"
}

# 2. VPC erstellen
resource "aws_vpc" "live_chat_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "live-chat-vpc"
  }
}

resource "aws_subnet" "public_subnet_a" {
  vpc_id                  = aws_vpc.live_chat_vpc.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "eu-central-1a"
  tags = {
    Name = "public-subnet-a"
  }
}

resource "aws_subnet" "public_subnet_b" {
  vpc_id                  = aws_vpc.live_chat_vpc.id
  cidr_block              = "10.0.2.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "eu-central-1b"
  tags = {
    Name = "public-subnet-b"
  }
}

resource "aws_subnet" "private_subnet_a" {
  vpc_id            = aws_vpc.live_chat_vpc.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = "eu-central-1a"
  tags = {
    Name = "private-subnet-a"
  }
}

resource "aws_subnet" "private_subnet_b" {
  vpc_id            = aws_vpc.live_chat_vpc.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = "eu-central-1b"
  tags = {
    Name = "private-subnet-b"
  }
}


# Internet Gateway erstellen
resource "aws_internet_gateway" "live_chat_igw" {
  vpc_id = aws_vpc.live_chat_vpc.id

  tags = {
    Name = "live-chat-igw"
  }
}

# Route Tables für public und private Subnetze erstellen:
# Public Route Table mit Internet Gateway
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.live_chat_vpc.id
  tags = {
    Name = "public-rt"
  }
}

resource "aws_route" "public_internet_access" {
  route_table_id         = aws_route_table.public_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.live_chat_igw.id
}

resource "aws_route_table_association" "public_rta_a" {
  subnet_id      = aws_subnet.public_subnet_a.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_rta_b" {
  subnet_id      = aws_subnet.public_subnet_b.id
  route_table_id = aws_route_table.public_rt.id
}

# NAT Gateway im Public Subnetz erstellen
resource "aws_eip" "nat_eip" {
  vpc = true
  tags = {
    Name = "nat-eip"
  }
}

resource "aws_nat_gateway" "nat_gw" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet_a.id
  tags = {
    Name = "nat-gw"
  }
  depends_on = [aws_internet_gateway.live_chat_igw]
}

# Private Route Table mit NAT Gateway
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.live_chat_vpc.id
  tags = {
    Name = "private-rt"
  }
}

resource "aws_route" "private_internet_access" {
  route_table_id         = aws_route_table.private_rt.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.nat_gw.id
}

resource "aws_route_table_association" "private_rta_a" {
  subnet_id      = aws_subnet.private_subnet_a.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_rta_b" {
  subnet_id      = aws_subnet.private_subnet_b.id
  route_table_id = aws_route_table.private_rt.id
}

# ALB Security Group (alb_sg): Erlaubt eingehenden Traffic von 0.0.0.0/0 auf Port 80/443.
resource "aws_security_group" "alb_sg" {
  vpc_id = aws_vpc.live_chat_vpc.id

  # HTTPS Ingress
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Falls gewünscht: HTTP Ingress für Weiterleitung
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-sg"
  }
}


# ECS Service Security Group (live_chat_service_sg): Erlaubt eingehenden Traffic nur von der ALB-SG auf Port 3000. Kein direkter Zugriff aus dem Internet.
resource "aws_security_group" "live_chat_service_sg" {
  vpc_id = aws_vpc.live_chat_vpc.id
  
  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]  # ALB SG als Quelle
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "live-chat-service-sg"
  }
}



# 5. ECS Cluster
resource "aws_ecs_cluster" "live_chat_cluster" {
  name = "live-chat-cluster"
}

# 6. Task-Definition
resource "aws_ecs_task_definition" "live_chat_task" {
  family                   = "live-chat-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "live-chat-container",
      image     = "${aws_ecr_repository.live_chat_repo.repository_url}:latest",
      cpu       = 256,
      memory    = 512,
      essential = true,
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
    }
  ])
}

# 7. Load Balancer
resource "aws_lb" "live_chat_alb" {
  name               = "live-chat-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets = [
    aws_subnet.public_subnet_a.id,
    aws_subnet.public_subnet_b.id
  ]
}


resource "aws_lb_target_group" "live_chat_target" {
  name        = "live-chat-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.live_chat_vpc.id
  target_type = "ip"
}


resource "aws_lb_listener" "live_chat_http_listener" {
  load_balancer_arn = aws_lb.live_chat_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}


resource "aws_lb_listener" "live_chat_https_listener" {
  load_balancer_arn = aws_lb.live_chat_alb.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = local.eu_cert_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.live_chat_target.arn
  }
}



# 8. ECS Service
resource "aws_ecs_service" "live_chat_service" {
  name            = "live-chat-service"
  cluster         = aws_ecs_cluster.live_chat_cluster.id
  task_definition = aws_ecs_task_definition.live_chat_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [
      aws_subnet.private_subnet_a.id,
      aws_subnet.private_subnet_b.id
    ]
    security_groups = [aws_security_group.live_chat_service_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.live_chat_target.arn
    container_name   = "live-chat-container"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.live_chat_https_listener, 
  aws_lb_listener.live_chat_http_listener
  ]
}


# 9. IAM Role für Task-Execution
# Verwende die bestehende Rolle ecsTaskExecutionRole
data "aws_iam_role" "ecs_task_execution_role" {
  name = "ecsTaskExecutionRole"
}

resource "aws_iam_policy_attachment" "ecs_task_execution_policy" {
  name       = "ecs-task-execution-policy"
  roles      = [data.aws_iam_role.ecs_task_execution_role.name]
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}


locals {
  s3_bucket_name = "sys-crowdconnect-scheider"
  domain         = "crowdconnect.fun"
  hosted_zone_id = "Z080884724KY8PB2MXITF"
  us_cert_arn       = "arn:aws:acm:us-east-1:522814722868:certificate/697927e5-9734-4a1a-b5be-23b65a487b95"
  eu_cert_arn = "arn:aws:acm:eu-central-1:522814722868:certificate/bea0afbf-6f4b-4d7b-abc8-e5210bfeee65"
}

resource "aws_s3_bucket" "main" {
  bucket = local.s3_bucket_name
}


resource "aws_cloudfront_distribution" "main" {
  aliases             = [local.domain]
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  wait_for_deployment = true

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    target_origin_id       = aws_s3_bucket.main.bucket
    viewer_protocol_policy = "redirect-to-https"
  }

  origin {
    domain_name              = aws_s3_bucket.main.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
    origin_id                = aws_s3_bucket.main.bucket
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = local.us_cert_arn
    minimum_protocol_version = "TLSv1.2_2021"
    ssl_support_method       = "sni-only"
  }
}

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "s3-cloudfront-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "cloudfront_oac_access" {
  statement {
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions = [
      "s3:GetObject"
    ]

    resources = ["${aws_s3_bucket.main.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id
  policy = data.aws_iam_policy_document.cloudfront_oac_access.json
}
