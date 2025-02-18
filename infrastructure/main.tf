# create ecr repository
resource "aws_ecr_repository" "live_chat_repo" {
  name = "live-chat-app"
}

# create vpc
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


# create internet gateway
resource "aws_internet_gateway" "live_chat_igw" {
  vpc_id = aws_vpc.live_chat_vpc.id

  tags = {
    Name = "live-chat-igw"
  }
}

# public route table with internet gateway
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

# create nat gateway
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

# route table for private subnets
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

# security group for alb
resource "aws_security_group" "alb_sg" {
  vpc_id = aws_vpc.live_chat_vpc.id

  # HTTPS Ingress
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

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


# security group for ecs
resource "aws_security_group" "live_chat_service_sg" {
  vpc_id = aws_vpc.live_chat_vpc.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
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
  retention_in_days = 7
}


# create ecs cluster
resource "aws_ecs_cluster" "live_chat_cluster" {
  name = "live-chat-cluster"

  setting {
    name  = "containerInsights"
    value = "enhanced"
  }
}


# task definition
resource "aws_ecs_task_definition" "live_chat_task" {
  family                   = "live-chat-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024"
  memory                   = "2048"

  execution_role_arn = data.aws_iam_role.ecs_task_execution_role.arn
  task_role_arn      = aws_iam_role.live_chat_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "live-chat-container",
      image     = "${aws_ecr_repository.live_chat_repo.repository_url}:latest",
      cpu       = 1024,
      memory    = 2048,
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
          "awslogs-group"         = "${aws_cloudwatch_log_group.live_chat_logs.name}"
          "awslogs-region"        = "eu-central-1"
          "awslogs-stream-prefix" = "live-chat"
        }
      }
    },
    {
      name      = "cwagent",
      image     = "public.ecr.aws/cloudwatch-agent/cloudwatch-agent:latest",
      cpu       = 0,
      memory    = 128,
      essential = false,
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "${aws_cloudwatch_log_group.live_chat_logs.name}"
          "awslogs-region"        = "eu-central-1"
          "awslogs-stream-prefix" = "cwagent"
        }
      },
      environment = [
        {
          name  = "CW_CONFIG_CONTENT"
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
          { "name": "cpu_usage_active", "rename": "CPUUtilization", "unit": "Percent" }
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
      // Start command: transfer the Env variable as a config file
      entryPoint = [
        "/opt/aws/amazon-cloudwatch-agent/bin/start-amazon-cloudwatch-agent"
      ],
      command = [
        "-config", "/tmp/cwagent-config.json", // Path under which the file is to be saved
        "-configmap", "CW_CONFIG_CONTENT",     // Tells the agent to use the content from Env
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


# create load balancer
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
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 3
    unhealthy_threshold = 2
    matcher             = "200"
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



# create ecs service
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

# scaling for ecs service 
resource "aws_appautoscaling_target" "ecs_service_target" {
  max_capacity       = 2
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.live_chat_cluster.name}/${aws_ecs_service.live_chat_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_service_policy" {
  name               = "ecs-service-scaling-policy"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_service_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_service_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_service_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 60.0

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

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

resource "aws_cloudfront_distribution" "main" {
  aliases             = [local.domain]
  default_root_object = "index.html"
  enabled             = true
  is_ipv6_enabled     = true
  wait_for_deployment = true

  default_cache_behavior {
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    origin_request_policy_id = aws_cloudfront_origin_request_policy.forward_all_cookies.id
    target_origin_id         = aws_s3_bucket.main.bucket
    viewer_protocol_policy   = "redirect-to-https"
  }

  origin {
    domain_name              = aws_s3_bucket.main.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
    origin_id                = aws_s3_bucket.main.bucket
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
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
    description     = "Allow inbound from ECS Service SG on Redis port"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
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


resource "aws_dynamodb_table" "users" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "id"
    type = "S"
  }

  hash_key = "id"

  table_class = "STANDARD"
}


resource "aws_dynamodb_table" "channels" {
  name         = "Channels"
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
      aws_dynamodb_table.channels.arn
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
