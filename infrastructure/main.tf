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
    security_groups = [aws_security_group.alb_sg.id] # ALB SG als Quelle
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

resource "aws_cloudwatch_log_group" "live_chat_logs" {
  name              = "/ecs/live-chat-task"
  retention_in_days = 7 # oder gewünschter Aufbewahrungszeitraum
}


# 5. ECS Cluster
resource "aws_ecs_cluster" "live_chat_cluster" {
  name = "live-chat-cluster"

  setting {
    name  = "containerInsights"
    value = "enhanced"
  }
}


# 6. Task-Definition
resource "aws_ecs_task_definition" "live_chat_task" {
  family                   = "live-chat-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"

  execution_role_arn = data.aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.live_chat_task_role.arn

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
      ],
      environment = [
        {
          name  = "REDIS_ENDPOINT"
          value = "${aws_elasticache_cluster.redis_cluster.cache_nodes[0].address}"
        },
        {
          name  = "FRONTEND_URL"
          value = "https://crowdconnect.fun"
        }
      ],
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          # CloudWatch Log Group
          "awslogs-group" = "${aws_cloudwatch_log_group.live_chat_logs.name}"
          # Region deiner Infrastruktur
          "awslogs-region" = "eu-central-1"
          # Wird später zur Unterscheidung der Container-Streams benutzt
          "awslogs-stream-prefix" = "live-chat"
        }
      }
    },
    {
      name      = "cwagent",
      image     = "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest",
      cpu       = 0,
      memory    = 128,
      essential = false, // "false", damit der Agent-Container optional ist und dein Hauptcontainer weiterlaufen kann
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "${aws_cloudwatch_log_group.live_chat_logs.name}"
          "awslogs-region"        = "eu-central-1"
          "awslogs-stream-prefix" = "cwagent"
        }
      },
      // Variante A: Konfiguration als Env-Variable
      environment = [
        {
          name  = "CW_CONFIG_CONTENT" // Name beliebig
          value = <<EOF
{
  "agent": {
    "metrics_collection_interval": 1,
    "run_as_user": "root"
  },
  "metrics": {
    "namespace": "LiveChatCustom",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          { "name": "usage_active", "rename": "CPUUtilization", "unit": "Percent" }
        ],
        "metrics_collection_interval": 1
      },
      "mem": {
        "measurement": [
          { "name": "mem_used_percent", "rename": "MemoryUtilization", "unit": "Percent" }
        ],
        "metrics_collection_interval": 1
      },
      "net": {
        "measurement": [
          { "name": "bytes_recv", "unit": "Bytes" },
          { "name": "bytes_sent", "unit": "Bytes" }
        ],
        "metrics_collection_interval": 1
      }
    }
  }
}
EOF
        }
      ],
      // Startbefehl: übergebe die Env-Variable als Konfigfile
      entryPoint = [
        "/opt/aws/amazon-cloudwatch-agent/bin/start-amazon-cloudwatch-agent"
      ],
      command = [
        "-config", "/tmp/cwagent-config.json", // Pfad, unter dem die Datei gespeichert werden soll
        "-configmap", "CW_CONFIG_CONTENT",     // Sagt dem Agent, er soll den Inhalt aus Env verwenden
        "-env"
      ]
    }
  ])
}










data "aws_iam_policy_document" "cloudwatch_agent_policy_doc" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "cloudwatch:PutMetricData"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "cloudwatch_agent_policy" {
  name   = "CloudWatchAgentPolicy"
  policy = data.aws_iam_policy_document.cloudwatch_agent_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "attach_cloudwatch_agent_policy" {
  role       = aws_iam_role.live_chat_task_role.name
  policy_arn = aws_iam_policy.cloudwatch_agent_policy.arn
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

  health_check {
    path                = "/health" # Endpunkt für den Health Check
    interval            = 30        # Zeit zwischen Prüfungen in Sekunden
    timeout             = 5         # Zeit in Sekunden, bevor ein Check fehlschlägt
    healthy_threshold   = 3         # Anzahl erfolgreicher Checks, um "healthy" zu werden
    unhealthy_threshold = 2         # Anzahl fehlgeschlagener Checks, um "unhealthy" zu werden
    matcher             = "200"     # Erwarteter HTTP-Statuscode
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 10
  }
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
    subnets = [
      aws_subnet.private_subnet_a.id,
      aws_subnet.private_subnet_b.id
    ]
    security_groups  = [aws_security_group.live_chat_service_sg.id]
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
  us_cert_arn    = "arn:aws:acm:us-east-1:522814722868:certificate/697927e5-9734-4a1a-b5be-23b65a487b95"
  eu_cert_arn    = "arn:aws:acm:eu-central-1:522814722868:certificate/bea0afbf-6f4b-4d7b-abc8-e5210bfeee65"
}

resource "aws_s3_bucket" "main" {
  bucket = local.s3_bucket_name
}

# 1) The custom Origin Request Policy that forwards all cookies
resource "aws_cloudfront_origin_request_policy" "forward_all_cookies" {
  name = "forward-all-cookies"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "none"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# 2) Updated CloudFront distribution
resource "aws_cloudfront_distribution" "main" {
  aliases             = [local.domain]
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  wait_for_deployment = true

  # Default Cache Behavior
  default_cache_behavior {
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]

    # Use a managed cache policy (example: CachingOptimized)...
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    # ...and attach your custom origin request policy to forward cookies.
    origin_request_policy_id = aws_cloudfront_origin_request_policy.forward_all_cookies.id

    # The ID of the origin to which you want to forward requests
    target_origin_id       = aws_s3_bucket.main.bucket
    viewer_protocol_policy = "redirect-to-https"
  }

  # Your existing S3 origin
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




##################################
#                                 
# Redis implementierung
#
##################################


resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name        = "redis-subnet-group"
  description = "Subnet group for Redis"

  subnet_ids = [
    aws_subnet.private_subnet_a.id,
    aws_subnet.private_subnet_b.id
  ]
}


resource "aws_security_group" "redis_sg" {
  name   = "redis-sg"
  vpc_id = aws_vpc.live_chat_vpc.id

  ingress {
    description = "Allow inbound from ECS Service SG on Redis port"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    # Aus Sicherheitsgründen direkt die SG deines ECS-Services angeben
    security_groups = [aws_security_group.live_chat_service_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "redis-sg"
  }
}


resource "aws_elasticache_cluster" "redis_cluster" {
  cluster_id           = "live-chat-redis-cluster"
  engine               = "redis"
  engine_version       = "6.2"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  tags = {
    Name = "live-chat-redis"
  }
}




##### dynamodb

resource "aws_dynamodb_table" "users" {
  name         = "Users2"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "id"
    type = "S"
  }

  hash_key = "id"

  table_class = "STANDARD"
}


resource "aws_dynamodb_table" "chatrooms" {
  name         = "ChatRooms"
  billing_mode = "PAY_PER_REQUEST"


  attribute {
    name = "name"
    type = "S"
  }

  hash_key = "name"

  table_class = "STANDARD"
}


data "aws_iam_policy_document" "live_chat_task_role_assume_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "live_chat_task_role" {
  name_prefix        = "live-chat-task-role-"
  assume_role_policy = data.aws_iam_policy_document.live_chat_task_role_assume_policy.json
  description        = "IAM Role for ECS tasks to access DynamoDB"
}


data "aws_iam_policy_document" "live_chat_task_policy" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:*"
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      aws_dynamodb_table.chatrooms.arn
    ]
  }
}

resource "aws_iam_policy" "live_chat_task_policy" {
  name        = "live-chat-task-policy"
  description = "Policy for ECS tasks to access DynamoDB tables"
  policy      = data.aws_iam_policy_document.live_chat_task_policy.json
}


resource "aws_iam_role_policy_attachment" "live_chat_task_attachment" {
  role       = aws_iam_role.live_chat_task_role.name
  policy_arn = aws_iam_policy.live_chat_task_policy.arn
}
