variable "account_id" {
  type        = string
  description = "Cloudflare account ID that owns Zero Trust Access."
}

variable "environment" {
  type        = string
  description = "Environment name used for naming Access resources (e.g. prod, sandbox)."
  default     = "prod"
}

variable "allowed_emails" {
  type        = list(string)
  description = "Email addresses allowed to access protected apps."
  default     = []
}

variable "allowed_email_domains" {
  type        = list(string)
  description = "Email domains allowed to access protected apps."
  default     = []
}

variable "admin_policy_id" {
  type        = string
  description = "Reusable Access policy ID managed in the ftops repo."
  default     = "26d82360-264b-4102-84ea-690dfe3411f8"
}
