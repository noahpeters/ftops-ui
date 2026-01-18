output "ops_application_id" {
  description = "Access application ID for ops.from-trees.com."
  value       = cloudflare_zero_trust_access_application.ops.id
}

output "admin_policy_id" {
  description = "Reusable Access policy ID managed in the ftops repo."
  value       = var.admin_policy_id
}
