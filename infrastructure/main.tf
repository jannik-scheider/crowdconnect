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

# 3. Subnet in zwei Availability Zones
resource "aws_subnet" "live_chat_subnet_a" {
  vpc_id            = aws_vpc.live_chat_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "eu-central-1a"
  tags = {
    Name = "live-chat-subnet-a"
  }
}

resource "aws_subnet" "live_chat_subnet_b" {
  vpc_id            = aws_vpc.live_chat_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "eu-central-1b"
  tags = {
    Name = "live-chat-subnet-b"
  }
}

# Internet Gateway erstellen
resource "aws_internet_gateway" "live_chat_igw" {
  vpc_id = aws_vpc.live_chat_vpc.id

  tags = {
    Name = "live-chat-igw"
  }
}

# Route Table erstellen
resource "aws_route_table" "live_chat_rt" {
  vpc_id = aws_vpc.live_chat_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.live_chat_igw.id
  }

  tags = {
    Name = "live-chat-rt"
  }
}

# Route Table mit Subnet A verbinden
resource "aws_route_table_association" "live_chat_rta_a" {
  subnet_id      = aws_subnet.live_chat_subnet_a.id
  route_table_id = aws_route_table.live_chat_rt.id
}

# Route Table mit Subnet B verbinden
resource "aws_route_table_association" "live_chat_rta_b" {
  subnet_id      = aws_subnet.live_chat_subnet_b.id
  route_table_id = aws_route_table.live_chat_rt.id
}


resource "aws_security_group" "live_chat_sg" {
  vpc_id = aws_vpc.live_chat_vpc.id

  # Inbound (Eingehender Traffic)
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound (Ausgehender Traffic)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1" # Erlaubt alle Protokolle
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "live-chat-sg"
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
  security_groups    = [aws_security_group.live_chat_sg.id]
  subnets            = [
    aws_subnet.live_chat_subnet_a.id,
    aws_subnet.live_chat_subnet_b.id
  ]
}

resource "aws_lb_target_group" "live_chat_target" {
  name        = "live-chat-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.live_chat_vpc.id
  target_type = "ip"
}

resource "aws_lb_listener" "live_chat_listener" {
  load_balancer_arn = aws_lb.live_chat_alb.arn
  port              = 80
  protocol          = "HTTP"

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
      aws_subnet.live_chat_subnet_a.id,
      aws_subnet.live_chat_subnet_b.id
    ]
    security_groups = [aws_security_group.live_chat_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.live_chat_target.arn
    container_name   = "live-chat-container"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.live_chat_listener]
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
  s3_bucket_name = "sys-crowdconnect-scheider"  # Eindeutiger Name
}

resource "aws_s3_bucket" "main" {
  bucket = local.s3_bucket_name
}

resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "s3-cloudfront-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  # Hier keine Aliases mehr, da wir keine eigene Domain nutzen
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  wait_for_deployment = true

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    target_origin_id       = aws_s3_bucket.main.bucket
    # HTTP erlauben
    viewer_protocol_policy = "allow-all"
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
    cloudfront_default_certificate = true
  }

  # Kein viewer_certificate Block mehr, somit kein HTTPS-Zwang
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
