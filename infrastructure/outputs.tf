output "ecr_repository_url" {
  value = aws_ecr_repository.live_chat_repo.repository_url
}

output "ecs_service_name" {
  value = aws_ecs_service.live_chat_service.name
}

output "alb_dns_name" {
  value = aws_lb.live_chat_alb.dns_name
}

output "redis_endpoint" {
  description = "Endpoint for the ElastiCache Redis cluster"
  value       = aws_elasticache_cluster.redis_cluster.cache_nodes[0].address
}
