/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `assignment_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignment_roles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assignments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `hours_planned` double NOT NULL DEFAULT 0 COMMENT 'how many hours of the total workload is assigned to that worker',
  `hours_weekly` double NOT NULL DEFAULT 0 COMMENT 'how many hours are estimated weekly for this project',
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `assignee_id` int(10) unsigned DEFAULT NULL,
  `assignee_type` varchar(255) DEFAULT NULL,
  `role_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assignments_role_id_foreign` (`role_id`),
  KEY `assignments_parent_id_index` (`parent_id`),
  KEY `assignments_parent_type_index` (`parent_type`),
  KEY `assignments_assignee_id_index` (`assignee_id`),
  KEY `assignments_assignee_type_index` (`assignee_type`),
  KEY `idx_parent_assignee` (`parent_type`,`parent_id`,`assignee_type`,`assignee_id`),
  KEY `assignments_created_at_index` (`created_at`),
  KEY `assignments_updated_at_index` (`updated_at`),
  CONSTRAINT `assignments_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `assignment_roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `calendar_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_entries` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `vcalendar` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cash_registers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_registers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `occured_at` date NOT NULL,
  `description` varchar(255) NOT NULL,
  `approver` varchar(255) NOT NULL,
  `value` decimal(30,2) NOT NULL DEFAULT 0.00,
  `cash_register_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cashes_cash_register_id_foreign` (`cash_register_id`),
  KEY `cashes_created_at_index` (`created_at`),
  KEY `cashes_updated_at_index` (`updated_at`),
  CONSTRAINT `cashes_cash_register_id_foreign` FOREIGN KEY (`cash_register_id`) REFERENCES `cash_registers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `text` text NOT NULL,
  `type` int(11) NOT NULL DEFAULT 0,
  `is_sticky` tinyint(1) NOT NULL DEFAULT 0,
  `is_mini` tinyint(1) NOT NULL DEFAULT 0,
  `user_id` int(10) unsigned DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comments_user_id_foreign` (`user_id`),
  KEY `comments_parent_id_index` (`parent_id`),
  KEY `comments_parent_type_index` (`parent_type`),
  KEY `idx_parent_created` (`parent_type`,`parent_id`,`created_at`),
  KEY `comments_created_at_index` (`created_at`),
  KEY `comments_updated_at_index` (`updated_at`),
  CONSTRAINT `comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `vcard` longtext NOT NULL,
  `customer_number` varchar(255) DEFAULT NULL,
  `vat_id` varchar(255) DEFAULT NULL,
  `managing_director` varchar(255) DEFAULT NULL,
  `commercial_register` varchar(255) DEFAULT NULL,
  `invoice_correction` varchar(255) DEFAULT NULL,
  `invoice_email` varchar(255) DEFAULT NULL,
  `requires_po` tinyint(1) NOT NULL DEFAULT 0,
  `has_nda` tinyint(1) NOT NULL DEFAULT 0,
  `accepts_support` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'has accepted invoicing for support foci',
  `discount` double NOT NULL DEFAULT 0,
  `payment_duration` double DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lon` double DEFAULT NULL,
  `net` double DEFAULT NULL COMMENT 'precomputed',
  `default_product_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `default_contact_id` int(10) unsigned DEFAULT NULL,
  `default_invoicee_id` int(10) unsigned DEFAULT NULL,
  `is_deprecated` tinyint(1) NOT NULL DEFAULT 0,
  `total_time` double DEFAULT NULL COMMENT 'precomputed',
  `source_id` int(10) unsigned DEFAULT NULL,
  `source_type` varchar(255) DEFAULT NULL,
  `remarketing_interval` int(11) NOT NULL DEFAULT 0 COMMENT 'enum Recurrence',
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `companies_default_product_id_foreign` (`default_product_id`),
  KEY `companies_default_contact_id_foreign` (`default_contact_id`),
  KEY `companies_default_invoicee_id_foreign` (`default_invoicee_id`),
  KEY `companies_source_id_index` (`source_id`),
  KEY `companies_source_type_index` (`source_type`),
  KEY `idx_active_companies` (`deleted_at`,`is_deprecated`),
  KEY `companies_created_at_index` (`created_at`),
  KEY `companies_updated_at_index` (`updated_at`),
  CONSTRAINT `companies_default_contact_id_foreign` FOREIGN KEY (`default_contact_id`) REFERENCES `company_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `companies_default_invoicee_id_foreign` FOREIGN KEY (`default_invoicee_id`) REFERENCES `company_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `companies_default_product_id_foreign` FOREIGN KEY (`default_product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `company_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_contacts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `vcard` longtext NOT NULL,
  `is_retired` tinyint(1) NOT NULL DEFAULT 0,
  `is_favorite` tinyint(1) NOT NULL DEFAULT 0,
  `is_invoicing_address` tinyint(1) NOT NULL DEFAULT 0,
  `company_id` int(10) unsigned NOT NULL,
  `contact_id` int(10) unsigned NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `company_contacts_company_id_foreign` (`company_id`),
  KEY `company_contacts_contact_id_foreign` (`contact_id`),
  CONSTRAINT `company_contacts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `company_contacts_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `connection_projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `connection_projects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `connection_id` int(10) unsigned DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `connection_projects_connection_id_foreign` (`connection_id`),
  KEY `connection_projects_project_id_foreign` (`project_id`),
  CONSTRAINT `connection_projects_connection_id_foreign` FOREIGN KEY (`connection_id`) REFERENCES `connections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connection_projects_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `connections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `connections` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `comment` varchar(255) NOT NULL DEFAULT '',
  `net` double DEFAULT NULL COMMENT 'precomputed',
  `company1_id` int(10) unsigned NOT NULL,
  `company2_id` int(10) unsigned NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `connections_company1_id_foreign` (`company1_id`),
  KEY `connections_company2_id_foreign` (`company2_id`),
  KEY `connections_created_at_index` (`created_at`),
  KEY `connections_updated_at_index` (`updated_at`),
  CONSTRAINT `connections_company1_id_foreign` FOREIGN KEY (`company1_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `connections_company2_id_foreign` FOREIGN KEY (`company2_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contacts` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `at2_connect_token` char(36) DEFAULT NULL,
  `at2_connect_thread_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `vcard` longtext NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contacts_at2_connect_token_unique` (`at2_connect_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_positives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_positives` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `debrief_project_debrief_id` int(10) unsigned NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `debrief_problem_category_id` int(10) unsigned DEFAULT NULL,
  `reported_by_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `debrief_positives_debrief_problem_category_id_foreign` (`debrief_problem_category_id`),
  KEY `debrief_positives_reported_by_user_id_foreign` (`reported_by_user_id`),
  KEY `debrief_positives_debrief_project_debrief_id_index` (`debrief_project_debrief_id`),
  CONSTRAINT `debrief_positives_debrief_problem_category_id_foreign` FOREIGN KEY (`debrief_problem_category_id`) REFERENCES `debrief_problem_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `debrief_positives_debrief_project_debrief_id_foreign` FOREIGN KEY (`debrief_project_debrief_id`) REFERENCES `debrief_project_debriefs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `debrief_positives_reported_by_user_id_foreign` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_problem_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_problem_categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(7) NOT NULL DEFAULT '#6c757d',
  `icon` varchar(50) NOT NULL DEFAULT 'folder',
  `position` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `debrief_problem_categories_position_index` (`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_problem_project_debrief`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_problem_project_debrief` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `debrief_problem_id` int(10) unsigned NOT NULL,
  `debrief_project_debrief_id` int(10) unsigned NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `context_notes` text DEFAULT NULL,
  `reported_by_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `problem_debrief_unique` (`debrief_problem_id`,`debrief_project_debrief_id`),
  KEY `dppd_debrief_fk` (`debrief_project_debrief_id`),
  KEY `dppd_user_fk` (`reported_by_user_id`),
  KEY `debrief_problem_project_debrief_severity_index` (`severity`),
  CONSTRAINT `dppd_debrief_fk` FOREIGN KEY (`debrief_project_debrief_id`) REFERENCES `debrief_project_debriefs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dppd_problem_fk` FOREIGN KEY (`debrief_problem_id`) REFERENCES `debrief_problems` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dppd_user_fk` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_problem_solution`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_problem_solution` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `debrief_problem_id` int(10) unsigned NOT NULL,
  `debrief_solution_id` int(10) unsigned NOT NULL,
  `debrief_project_debrief_id` int(10) unsigned DEFAULT NULL,
  `effectiveness_rating` tinyint(3) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `linked_by_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `dps_debrief_fk` (`debrief_project_debrief_id`),
  KEY `dps_user_fk` (`linked_by_user_id`),
  KEY `debrief_problem_solution_debrief_problem_id_index` (`debrief_problem_id`),
  KEY `debrief_problem_solution_debrief_solution_id_index` (`debrief_solution_id`),
  KEY `debrief_problem_solution_effectiveness_rating_index` (`effectiveness_rating`),
  CONSTRAINT `dps_debrief_fk` FOREIGN KEY (`debrief_project_debrief_id`) REFERENCES `debrief_project_debriefs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dps_problem_fk` FOREIGN KEY (`debrief_problem_id`) REFERENCES `debrief_problems` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dps_solution_fk` FOREIGN KEY (`debrief_solution_id`) REFERENCES `debrief_solutions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dps_user_fk` FOREIGN KEY (`linked_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_problems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_problems` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `debrief_problem_category_id` int(10) unsigned NOT NULL,
  `created_by_user_id` int(10) unsigned DEFAULT NULL,
  `usage_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `debrief_problems_created_by_user_id_foreign` (`created_by_user_id`),
  KEY `debrief_problems_usage_count_index` (`usage_count`),
  KEY `debrief_problems_debrief_problem_category_id_index` (`debrief_problem_category_id`),
  FULLTEXT KEY `debrief_problems_title_fulltext` (`title`),
  CONSTRAINT `debrief_problems_created_by_user_id_foreign` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `debrief_problems_debrief_problem_category_id_foreign` FOREIGN KEY (`debrief_problem_category_id`) REFERENCES `debrief_problem_categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_project_debriefs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_project_debriefs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `project_id` int(10) unsigned NOT NULL,
  `conducted_by_user_id` int(10) unsigned DEFAULT NULL,
  `debriefed_user_id` int(10) unsigned DEFAULT NULL,
  `conducted_at` timestamp NULL DEFAULT NULL,
  `summary_notes` text DEFAULT NULL,
  `rating` tinyint(3) unsigned DEFAULT NULL,
  `status` enum('draft','completed') NOT NULL DEFAULT 'draft',
  PRIMARY KEY (`id`),
  KEY `debrief_project_debriefs_conducted_by_user_id_foreign` (`conducted_by_user_id`),
  KEY `debrief_project_debriefs_status_index` (`status`),
  KEY `debrief_project_debriefs_conducted_at_index` (`conducted_at`),
  KEY `debrief_project_debriefs_project_id_foreign` (`project_id`),
  KEY `debrief_project_debriefs_debriefed_user_id_foreign` (`debriefed_user_id`),
  CONSTRAINT `debrief_project_debriefs_conducted_by_user_id_foreign` FOREIGN KEY (`conducted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `debrief_project_debriefs_debriefed_user_id_foreign` FOREIGN KEY (`debriefed_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `debrief_project_debriefs_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debrief_solutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debrief_solutions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by_user_id` int(10) unsigned DEFAULT NULL,
  `avg_effectiveness_rating` float DEFAULT NULL,
  `usage_count` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `debrief_solutions_created_by_user_id_foreign` (`created_by_user_id`),
  KEY `debrief_solutions_usage_count_index` (`usage_count`),
  KEY `debrief_solutions_avg_effectiveness_rating_index` (`avg_effectiveness_rating`),
  FULLTEXT KEY `debrief_solutions_title_fulltext` (`title`),
  CONSTRAINT `debrief_solutions_created_by_user_id_foreign` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `encryptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `encryptions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `key` varchar(255) NOT NULL COMMENT 'tagging, a user can have multiple encryptions with the same key',
  `value` text NOT NULL COMMENT 'encrypted data, can only be decrypted with an active keycloak token',
  `user_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `my_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `encryptions_user_id_foreign` (`user_id`),
  CONSTRAINT `encryptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `starts_at` date NOT NULL,
  `ends_at` date DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `repeat` int(11) NOT NULL DEFAULT 32,
  `price` decimal(30,2) NOT NULL DEFAULT 0.00,
  `invoice_item_id` int(10) unsigned DEFAULT NULL,
  `category_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `expenses_invoice_item_id_foreign` (`invoice_item_id`),
  KEY `expenses_category_id_foreign` (`category_id`),
  CONSTRAINT `expenses_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `expenses_invoice_item_id_foreign` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `aqua_id` int(11) DEFAULT NULL,
  `name` varchar(255) NOT NULL COMMENT 'original filename',
  `dir` varchar(255) NOT NULL COMMENT 'storage path',
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `mime` varchar(255) NOT NULL DEFAULT 'application/pdf',
  `category` varchar(255) DEFAULT NULL,
  `tags` text DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `dimensions` varchar(255) DEFAULT NULL,
  `uploaded_by` int(10) unsigned DEFAULT NULL,
  `permissions` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `type` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `files_parent_id_index` (`parent_id`),
  KEY `files_parent_type_index` (`parent_type`),
  KEY `files_created_at_index` (`created_at`),
  KEY `files_updated_at_index` (`updated_at`),
  KEY `files_parent_type_category_index` (`parent_type`,`category`),
  KEY `files_uploaded_by_foreign` (`uploaded_by`),
  CONSTRAINT `files_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `float_params`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `float_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `param_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `value` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `float_params_user_id_foreign` (`user_id`),
  KEY `float_params_language_index` (`language`),
  KEY `float_params_parent_id_index` (`parent_id`),
  KEY `float_params_parent_type_index` (`parent_type`),
  KEY `float_params_param_id_index` (`param_id`),
  KEY `float_params_param_created_index` (`param_id`,`created_at`),
  KEY `float_params_updated_at_index` (`updated_at`),
  KEY `float_params_param_parent_created_index` (`param_id`,`parent_id`,`parent_type`,`created_at`),
  CONSTRAINT `float_params_param_id_foreign` FOREIGN KEY (`param_id`) REFERENCES `params` (`id`) ON DELETE CASCADE,
  CONSTRAINT `float_params_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `foci`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foci` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `duration` double(50,2) NOT NULL DEFAULT 0.00,
  `comment` varchar(255) DEFAULT NULL,
  `is_unpaid` tinyint(1) NOT NULL DEFAULT 0,
  `invoice_item_id` int(10) unsigned DEFAULT NULL COMMENT 'focus on specific item "task"',
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `invoiced_in_item_id` int(10) unsigned DEFAULT NULL COMMENT 'relation to invoice item that was used for billing this focus',
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `foci_item_focus_id_foreign` (`invoice_item_id`),
  KEY `foci_user_id_foreign` (`user_id`),
  KEY `foci_parent_id_index` (`parent_id`),
  KEY `foci_parent_type_index` (`parent_type`),
  KEY `idx_started_at_user` (`started_at`,`user_id`),
  KEY `idx_parent_user_started` (`parent_type`,`parent_id`,`user_id`,`started_at`),
  KEY `idx_duration_sum` (`parent_type`,`parent_id`,`duration`),
  KEY `foci_created_at_index` (`created_at`),
  KEY `foci_updated_at_index` (`updated_at`),
  KEY `foci_invoiced_in_item_id_foreign` (`invoiced_in_item_id`),
  CONSTRAINT `foci_invoice_item_id_foreign` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `foci_invoiced_in_item_id_foreign` FOREIGN KEY (`invoiced_in_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `foci_item_focus_id_foreign` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `foci_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `frameworks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `frameworks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `latest_version` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `frameworks_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `i18n`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `i18n` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `parent_type` varchar(255) NOT NULL,
  `parent_id` bigint(20) unsigned NOT NULL,
  `language` varchar(10) NOT NULL,
  `formality` varchar(20) DEFAULT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `i18n_parent_type_parent_id_index` (`parent_type`,`parent_id`),
  KEY `i18n_parent_type_parent_id_language_formality_index` (`parent_type`,`parent_id`,`language`,`formality`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_item_milestone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_item_milestone` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `invoice_item_id` int(10) unsigned NOT NULL,
  `milestone_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_item_milestone_invoice_item_id_milestone_id_unique` (`invoice_item_id`,`milestone_id`),
  KEY `invoice_item_milestone_milestone_id_foreign` (`milestone_id`),
  CONSTRAINT `invoice_item_milestone_invoice_item_id_foreign` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_item_milestone_milestone_id_foreign` FOREIGN KEY (`milestone_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_item_predictions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_item_predictions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `qty` double(30,10) DEFAULT NULL,
  `invoice_item_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_item_predictions_invoice_item_id_foreign` (`invoice_item_id`),
  KEY `invoice_item_predictions_user_id_foreign` (`user_id`),
  CONSTRAINT `invoice_item_predictions_invoice_item_id_foreign` FOREIGN KEY (`invoice_item_id`) REFERENCES `invoice_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_item_predictions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_items` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `text` text NOT NULL COMMENT 'HTML description text',
  `type` int(11) NOT NULL DEFAULT 0 COMMENT 'enum InvoiceItemType',
  `position` int(11) NOT NULL DEFAULT 0,
  `vat_calculation` int(11) NOT NULL DEFAULT 0 COMMENT '0 net 1 gross',
  `vat_rate` decimal(4,1) NOT NULL DEFAULT 0.0 COMMENT 'applied vat rate (e.g. 19%)',
  `vat_rate_dec` decimal(4,3) GENERATED ALWAYS AS (0.01 * `vat_rate`) VIRTUAL,
  `vat_reason` varchar(255) DEFAULT NULL COMMENT 'reason why vat excemption applies',
  `next_recurrence_at` date DEFAULT NULL,
  `is_discountable` tinyint(1) NOT NULL DEFAULT 1,
  `discount` decimal(30,10) NOT NULL DEFAULT 0.0000000000,
  `price` decimal(30,2) NOT NULL DEFAULT 0.00 COMMENT 'single price',
  `price_discounted` decimal(30,10) GENERATED ALWAYS AS (round(`price` * (100 - `discount`) * 0.01,2)) VIRTUAL,
  `qty` decimal(30,10) NOT NULL DEFAULT 0.0000000000 COMMENT 'quantity',
  `unit_name` varchar(255) NOT NULL DEFAULT '',
  `unit_factor` decimal(30,4) GENERATED ALWAYS AS (case when `unit_name` = _utf8mb4'%' then 0.01 else 1 end) VIRTUAL,
  `total` decimal(30,4) GENERATED ALWAYS AS (`price_discounted` * `qty` * `unit_factor`) VIRTUAL,
  `net` decimal(30,2) GENERATED ALWAYS AS (case when `vat_calculation` = 0 then `total` else round(`total` / (1 + `vat_rate_dec`),2) end) VIRTUAL,
  `gross` decimal(30,2) GENERATED ALWAYS AS (case when `vat_calculation` = 1 then `total` else round(`total` * (1 + `vat_rate_dec`),2) end) VIRTUAL,
  `vat` double(8,2) GENERATED ALWAYS AS (`gross` - `net`) VIRTUAL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `product_id` int(10) unsigned DEFAULT NULL,
  `company_id` int(10) unsigned DEFAULT NULL,
  `invoice_id` int(10) unsigned DEFAULT NULL,
  `product_source_id` int(10) unsigned DEFAULT NULL COMMENT 'reference to origin product',
  `flags` int(10) unsigned NOT NULL,
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_project_id_foreign` (`project_id`),
  KEY `invoice_items_product_id_foreign` (`product_id`),
  KEY `invoice_items_company_id_foreign` (`company_id`),
  KEY `invoice_items_invoice_id_foreign` (`invoice_id`),
  KEY `invoice_items_product_source_id_foreign` (`product_source_id`),
  KEY `idx_project_type_company` (`project_id`,`type`,`company_id`),
  KEY `idx_invoice_company_null` (`invoice_id`,`company_id`),
  KEY `idx_type_net` (`type`,`net`),
  KEY `idx_project_invoice_company` (`project_id`,`invoice_id`,`company_id`),
  KEY `invoice_items_created_at_index` (`created_at`),
  KEY `invoice_items_updated_at_index` (`updated_at`),
  CONSTRAINT `invoice_items_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_product_source_id_foreign` FOREIGN KEY (`product_source_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoice_items_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoice_reminders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice_reminders` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `stage` int(11) NOT NULL DEFAULT 1,
  `fee` double NOT NULL DEFAULT 5,
  `invoice_id` int(10) unsigned DEFAULT NULL,
  `file_dir` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_reminders_invoice_id_foreign` (`invoice_id`),
  CONSTRAINT `invoice_reminders_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `company_id` int(10) unsigned DEFAULT NULL,
  `file_dir` varchar(255) DEFAULT NULL,
  `due_at` date DEFAULT NULL,
  `remind_at` date DEFAULT NULL,
  `paid_at` date DEFAULT NULL,
  `default_interest` double(8,2) NOT NULL DEFAULT 0.00,
  `is_cancelled` tinyint(1) NOT NULL DEFAULT 0,
  `is_booked` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'e.g. uploaded to DATEV',
  `sent` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0 not sent | 1 email | 2 printed',
  `vat_validation` text DEFAULT NULL,
  `net` double DEFAULT NULL COMMENT 'precomputed',
  `gross` double DEFAULT NULL COMMENT 'precomputed',
  `gross_remaining` double DEFAULT NULL COMMENT 'precomputed',
  `flags` int(10) unsigned NOT NULL,
  `cancellation_invoice_id` int(10) unsigned DEFAULT NULL,
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoices_company_id_foreign` (`company_id`),
  KEY `invoices_cancellation_invoice_id_foreign` (`cancellation_invoice_id`),
  KEY `invoices_created_at_index` (`created_at`),
  KEY `invoices_updated_at_index` (`updated_at`),
  CONSTRAINT `invoices_cancellation_invoice_id_foreign` FOREIGN KEY (`cancellation_invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `lead_sources`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead_sources` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL COMMENT 'current probability of lead success',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_activities` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_workflow_id` int(10) unsigned NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `day_offset` int(11) NOT NULL,
  `description` text NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `has_external_dependency` tinyint(1) NOT NULL DEFAULT 0,
  `parent_activity_id` int(10) unsigned DEFAULT NULL,
  `quick_action` enum('EMAIL','LINKEDIN','LINKEDIN_SEARCH','CALL') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ma_day_offset` (`marketing_workflow_id`,`day_offset`),
  KEY `marketing_activities_parent_activity_id_foreign` (`parent_activity_id`),
  CONSTRAINT `ma_marketing_workflow` FOREIGN KEY (`marketing_workflow_id`) REFERENCES `marketing_workflows` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marketing_activities_parent_activity_id_foreign` FOREIGN KEY (`parent_activity_id`) REFERENCES `marketing_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_activity_metric`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_activity_metric` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_activity_id` int(10) unsigned NOT NULL,
  `marketing_performance_metric_id` int(10) unsigned NOT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mam_unique` (`marketing_activity_id`,`marketing_performance_metric_id`),
  KEY `mam_metric_index` (`marketing_performance_metric_id`),
  CONSTRAINT `mam_marketing_activity` FOREIGN KEY (`marketing_activity_id`) REFERENCES `marketing_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mam_metric` FOREIGN KEY (`marketing_performance_metric_id`) REFERENCES `marketing_performance_metrics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_activities` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `marketing_workflow_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `day_offset` int(11) NOT NULL,
  `description` text NOT NULL,
  `is_required` tinyint(1) NOT NULL DEFAULT 1,
  `has_external_dependency` tinyint(1) NOT NULL DEFAULT 0,
  `parent_activity_id` int(10) unsigned DEFAULT NULL,
  `quick_action` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mia_parent_activity` (`parent_activity_id`),
  KEY `mia_initiative_day` (`marketing_initiative_id`,`day_offset`),
  KEY `marketing_initiative_activities_marketing_workflow_id_index` (`marketing_workflow_id`),
  CONSTRAINT `mia_marketing_initiative` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mia_marketing_workflow` FOREIGN KEY (`marketing_workflow_id`) REFERENCES `marketing_workflows` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mia_parent_activity` FOREIGN KEY (`parent_activity_id`) REFERENCES `marketing_initiative_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_activity_metric`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_activity_metric` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_activity_id` int(10) unsigned NOT NULL,
  `marketing_performance_metric_id` int(10) unsigned NOT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `miam_unique` (`marketing_initiative_activity_id`,`marketing_performance_metric_id`),
  KEY `miam_performance_metric` (`marketing_performance_metric_id`),
  CONSTRAINT `miam_initiative_activity` FOREIGN KEY (`marketing_initiative_activity_id`) REFERENCES `marketing_initiative_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `miam_performance_metric` FOREIGN KEY (`marketing_performance_metric_id`) REFERENCES `marketing_performance_metrics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_channels` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `lead_source_id` int(10) unsigned NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `custom_settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`custom_settings`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mic_initiative_source_unique` (`marketing_initiative_id`,`lead_source_id`),
  KEY `marketing_initiative_channels_lead_source_id_foreign` (`lead_source_id`),
  KEY `marketing_initiative_channels_is_primary_index` (`is_primary`),
  CONSTRAINT `marketing_initiative_channels_lead_source_id_foreign` FOREIGN KEY (`lead_source_id`) REFERENCES `lead_sources` (`id`) ON DELETE CASCADE,
  CONSTRAINT `marketing_initiative_channels_marketing_initiative_id_foreign` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_metric`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_metric` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `marketing_performance_metric_id` int(10) unsigned NOT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mim_unique` (`marketing_initiative_id`,`marketing_performance_metric_id`),
  KEY `mim_metric_index` (`marketing_performance_metric_id`),
  CONSTRAINT `mim_marketing_initiative` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mim_metric` FOREIGN KEY (`marketing_performance_metric_id`) REFERENCES `marketing_performance_metrics` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `role` enum('owner','member','viewer') NOT NULL DEFAULT 'member',
  `receives_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `miu_unique` (`marketing_initiative_id`,`user_id`),
  KEY `marketing_initiative_user_user_id_index` (`user_id`),
  CONSTRAINT `miu_marketing_initiative` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `miu_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiative_workflow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiative_workflow` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `marketing_workflow_id` int(10) unsigned NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `miw_unique` (`marketing_initiative_id`,`marketing_workflow_id`),
  KEY `marketing_initiative_workflow_marketing_workflow_id_index` (`marketing_workflow_id`),
  CONSTRAINT `miw_initiative` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `miw_workflow` FOREIGN KEY (`marketing_workflow_id`) REFERENCES `marketing_workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_initiatives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_initiatives` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` enum('active','paused','completed') NOT NULL DEFAULT 'active',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `marketing_initiatives_status_start_date_index` (`status`,`start_date`),
  KEY `marketing_initiatives_parent_id_index` (`parent_id`),
  CONSTRAINT `marketing_initiatives_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_performance_metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_performance_metrics` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `metric_type` enum('counter','percentage','conversion','currency','duration') NOT NULL,
  `target_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `marketing_performance_metrics_metric_type_index` (`metric_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_prospect_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_prospect_activities` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_prospect_id` int(10) unsigned NOT NULL,
  `marketing_initiative_activity_id` int(10) unsigned NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` enum('pending','completed','skipped','overdue','failed') NOT NULL DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `performance_value` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mpa_v2_prospect_status` (`marketing_prospect_id`,`status`),
  KEY `mpa_v2_scheduled_status` (`scheduled_at`,`status`),
  KEY `mpa_v2_activity_status` (`marketing_initiative_activity_id`,`status`),
  KEY `mpa_v2_completed_at` (`completed_at`),
  CONSTRAINT `mpa_v2_initiative_activity` FOREIGN KEY (`marketing_initiative_activity_id`) REFERENCES `marketing_initiative_activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mpa_v2_marketing_prospect` FOREIGN KEY (`marketing_prospect_id`) REFERENCES `marketing_prospects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_prospects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_prospects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `marketing_initiative_id` int(10) unsigned NOT NULL,
  `lead_source_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `company_id` int(10) unsigned DEFAULT NULL,
  `company_contact_id` int(10) unsigned DEFAULT NULL,
  `vcard` text DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `company` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `status` enum('new','engaged','converted','unresponsive','disqualified','on_hold') NOT NULL DEFAULT 'new',
  `days_skipped` int(11) NOT NULL DEFAULT 0,
  `added_via` enum('addon','manual','import') NOT NULL DEFAULT 'manual',
  `external_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`external_data`)),
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mp_marketing_initiative_id` (`marketing_initiative_id`,`status`),
  KEY `mp_lead_source_id` (`lead_source_id`,`status`),
  KEY `mp_user_id` (`user_id`,`status`),
  KEY `marketing_prospects_added_via_index` (`added_via`),
  KEY `marketing_prospects_email_index` (`email`),
  KEY `marketing_prospects_company_id_foreign` (`company_id`),
  KEY `marketing_prospects_company_contact_id_foreign` (`company_contact_id`),
  CONSTRAINT `marketing_prospects_company_contact_id_foreign` FOREIGN KEY (`company_contact_id`) REFERENCES `company_contacts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `marketing_prospects_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mp_lead_source` FOREIGN KEY (`lead_source_id`) REFERENCES `lead_sources` (`id`),
  CONSTRAINT `mp_marketing_initiative` FOREIGN KEY (`marketing_initiative_id`) REFERENCES `marketing_initiatives` (`id`) ON DELETE CASCADE,
  CONSTRAINT `mp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `marketing_workflows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketing_workflows` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `marketing_workflows_is_active_index` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `milestone_milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestone_milestones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `dependant_id` int(10) unsigned DEFAULT NULL,
  `dependee_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `milestone_milestones_dependant_id_foreign` (`dependant_id`),
  KEY `milestone_milestones_dependee_id_foreign` (`dependee_id`),
  CONSTRAINT `milestone_milestones_dependant_id_foreign` FOREIGN KEY (`dependant_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `milestone_milestones_dependee_id_foreign` FOREIGN KEY (`dependee_id`) REFERENCES `milestones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `milestones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `milestones` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `position` int(11) NOT NULL DEFAULT 0,
  `name` varchar(255) NOT NULL DEFAULT '',
  `comments` text DEFAULT NULL,
  `due_at` date DEFAULT NULL,
  `started_at` date DEFAULT NULL,
  `duration` int(11) NOT NULL DEFAULT 1 COMMENT 'Duration in days',
  `progress` int(11) NOT NULL DEFAULT 0 COMMENT 'Completion percentage 0-100',
  `state` int(11) NOT NULL DEFAULT 0,
  `flags` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `workload_hours` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `milestones_project_id_foreign` (`project_id`),
  KEY `milestones_due_at_index` (`due_at`),
  KEY `milestones_state_index` (`state`),
  KEY `milestones_project_id_position_index` (`project_id`,`position`),
  KEY `milestones_user_id_foreign` (`user_id`),
  CONSTRAINT `milestones_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `milestones_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `model_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `model_has_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint(20) unsigned NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `params`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `key` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'AppModelsFloatParam',
  `has_history` tinyint(1) NOT NULL DEFAULT 1,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `params_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_resets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` date DEFAULT NULL,
  KEY `password_resets_email_index` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `plugin_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plugin_links` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `framework_id` bigint(20) unsigned DEFAULT NULL,
  `framework_version` varchar(255) DEFAULT NULL,
  `is_deprecated` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `plugin_links_parent_id_index` (`parent_id`),
  KEY `plugin_links_parent_type_index` (`parent_type`),
  KEY `plugin_links_created_at_index` (`created_at`),
  KEY `plugin_links_updated_at_index` (`updated_at`),
  KEY `plugin_links_framework_id_foreign` (`framework_id`),
  CONSTRAINT `plugin_links_framework_id_foreign` FOREIGN KEY (`framework_id`) REFERENCES `frameworks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `product_group_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'Product group',
  `symbol` varchar(255) NOT NULL DEFAULT '',
  `color` varchar(255) NOT NULL DEFAULT '#009900',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `position` int(11) NOT NULL DEFAULT 0,
  `flags` int(10) unsigned NOT NULL,
  `net` double DEFAULT NULL,
  `quote` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `product_groups_product_group_id_foreign` (`product_group_id`),
  CONSTRAINT `product_groups_product_group_id_foreign` FOREIGN KEY (`product_group_id`) REFERENCES `product_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `product_group_id` int(10) unsigned DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `item_number` varchar(255) NOT NULL DEFAULT '',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_discountable` tinyint(1) NOT NULL DEFAULT 0,
  `time_based` int(11) NOT NULL DEFAULT 0 COMMENT '0 uses invoice item | 1 is hourly | 8 is daily',
  `recurrence` int(11) NOT NULL DEFAULT 0,
  `position` int(11) NOT NULL DEFAULT 0,
  `minimum_amount` int(11) NOT NULL DEFAULT 1 COMMENT 'Mimimum amount to be ordered',
  `package_amount` int(11) NOT NULL DEFAULT 1 COMMENT 'Only multiples of this amount can be created',
  `minimum_price` decimal(30,2) NOT NULL DEFAULT 0.00 COMMENT 'usually purchase price',
  `weight` double NOT NULL DEFAULT 0 COMMENT 'grams',
  `size_w` double NOT NULL DEFAULT 0,
  `size_h` double NOT NULL DEFAULT 0,
  `size_d` double NOT NULL DEFAULT 0,
  `net` double DEFAULT NULL COMMENT 'precomputed',
  `flags` int(10) unsigned NOT NULL,
  `quote` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `products_product_group_id_foreign` (`product_group_id`),
  CONSTRAINT `products_product_group_id_foreign` FOREIGN KEY (`product_group_id`) REFERENCES `product_groups` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `project_project_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_project_state` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `project_state_id` int(10) unsigned NOT NULL DEFAULT 0 COMMENT 'enum ProjectState',
  `project_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_states_project_id_foreign` (`project_id`),
  KEY `project_project_state_project_state_id_foreign` (`project_state_id`),
  KEY `idx_project_latest` (`project_id`,`id`),
  KEY `idx_project_created` (`project_id`,`created_at`),
  KEY `project_project_state_created_at_index` (`created_at`),
  KEY `project_project_state_updated_at_index` (`updated_at`),
  CONSTRAINT `project_project_state_project_state_id_foreign` FOREIGN KEY (`project_state_id`) REFERENCES `project_states` (`id`),
  CONSTRAINT `project_states_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `project_states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_states` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `is_in_stats` tinyint(1) NOT NULL,
  `is_successful` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `project_uptime_monitor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_uptime_monitor` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `project_id` int(10) unsigned NOT NULL,
  `uptime_monitor_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_uptime_monitor_project_id_uptime_monitor_id_unique` (`project_id`,`uptime_monitor_id`),
  KEY `project_uptime_monitor_uptime_monitor_id_foreign` (`uptime_monitor_id`),
  CONSTRAINT `project_uptime_monitor_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_uptime_monitor_uptime_monitor_id_foreign` FOREIGN KEY (`uptime_monitor_id`) REFERENCES `uptime_monitors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'New project',
  `description` text NOT NULL,
  `target_wage` double(20,2) NOT NULL DEFAULT 120.00,
  `individual_wage` double(20,2) DEFAULT NULL,
  `due_at` date DEFAULT NULL,
  `remind_at` date DEFAULT NULL,
  `deadline_at` date DEFAULT NULL,
  `is_internal` tinyint(1) NOT NULL DEFAULT 0,
  `is_time_based` tinyint(1) NOT NULL DEFAULT 0,
  `exclude_from_tbe` tinyint(1) NOT NULL DEFAULT 0,
  `is_discountable` tinyint(1) NOT NULL DEFAULT 0,
  `company_id` int(10) unsigned DEFAULT NULL,
  `project_id` int(10) unsigned DEFAULT NULL,
  `project_manager_id` int(10) unsigned DEFAULT NULL,
  `po_number` varchar(255) DEFAULT NULL,
  `net` double DEFAULT NULL COMMENT 'precomputed',
  `net_remaining` double DEFAULT NULL COMMENT 'precomputed',
  `gross` double DEFAULT NULL COMMENT 'precomputed',
  `product_id` int(10) unsigned DEFAULT NULL COMMENT 'default product for new invoice items',
  `flags` int(10) unsigned NOT NULL,
  `work_estimated` double DEFAULT NULL COMMENT 'precomputed',
  `lead_probability` double NOT NULL DEFAULT 0.2 COMMENT 'current probability of lead success',
  `lead_probability_argumentation` text DEFAULT NULL,
  `lead_probability_multiplier` decimal(8,2) NOT NULL DEFAULT 1.00,
  `is_ignored_from_prepared` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'flag for projects with invoice items that haven''t been invoiced yet to be manually hidden from widget',
  `marker` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `projects_company_id_foreign` (`company_id`),
  KEY `projects_project_id_foreign` (`project_id`),
  KEY `projects_project_manager_id_foreign` (`project_manager_id`),
  KEY `projects_product_id_foreign` (`product_id`),
  KEY `projects_due_at_index` (`due_at`),
  KEY `projects_remind_at_index` (`remind_at`),
  KEY `projects_deadline_at_index` (`deadline_at`),
  KEY `projects_is_internal_index` (`is_internal`),
  KEY `projects_is_time_based_index` (`is_time_based`),
  KEY `projects_exclude_from_tbe_index` (`exclude_from_tbe`),
  KEY `idx_company_not_deleted` (`company_id`,`deleted_at`),
  KEY `idx_created_company` (`created_at`,`company_id`),
  KEY `projects_created_at_index` (`created_at`),
  KEY `projects_updated_at_index` (`updated_at`),
  CONSTRAINT `projects_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL,
  CONSTRAINT `projects_project_manager_id_foreign` FOREIGN KEY (`project_manager_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint(20) unsigned NOT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `guard_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sentinel_triggers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sentinel_triggers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `triggered` tinyint(1) NOT NULL DEFAULT 0,
  `sentinel_id` int(10) unsigned DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sentinel_triggers_sentinel_id_foreign` (`sentinel_id`),
  KEY `sentinel_triggers_parent_id_index` (`parent_id`),
  KEY `sentinel_triggers_parent_type_index` (`parent_type`),
  CONSTRAINT `sentinel_triggers_sentinel_id_foreign` FOREIGN KEY (`sentinel_id`) REFERENCES `sentinels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sentinel_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sentinel_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL COMMENT 'subscriber of the sentinel',
  `sentinel_id` int(10) unsigned DEFAULT NULL COMMENT 'the sentinel',
  PRIMARY KEY (`id`),
  KEY `sentinel_users_user_id_foreign` (`user_id`),
  KEY `sentinel_users_sentinel_id_foreign` (`sentinel_id`),
  CONSTRAINT `sentinel_users_sentinel_id_foreign` FOREIGN KEY (`sentinel_id`) REFERENCES `sentinels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sentinel_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sentinels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sentinels` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'New sentinel',
  `table_name` varchar(255) DEFAULT NULL COMMENT 'table that needs to be observed',
  `trigger_variable` varchar(255) DEFAULT NULL COMMENT 'variable name for the trigger model in templates',
  `condition` text NOT NULL COMMENT 'additional conditions (json array) that must be met',
  `result` text NOT NULL COMMENT 'json array of actions that happen when sentinel triggers',
  `trigger` int(11) NOT NULL DEFAULT 0 COMMENT 'defines when the sentinel can be triggered',
  `user_id` int(10) unsigned DEFAULT NULL COMMENT 'owner of the sentinel',
  `primaryLabel` varchar(255) DEFAULT 'name' COMMENT 'field to be used for main label',
  `secondaryLabel` varchar(255) DEFAULT NULL COMMENT 'field to be used for secondary label',
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sentinels_user_id_foreign` (`user_id`),
  CONSTRAINT `sentinels_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `string_params`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `string_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `param_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `string_params_user_id_foreign` (`user_id`),
  KEY `string_params_language_index` (`language`),
  KEY `string_params_parent_id_index` (`parent_id`),
  KEY `string_params_parent_type_index` (`parent_type`),
  KEY `string_params_param_id_index` (`param_id`),
  KEY `string_params_param_created_index` (`param_id`,`created_at`),
  KEY `string_params_updated_at_index` (`updated_at`),
  KEY `string_params_param_parent_created_index` (`param_id`,`parent_id`,`parent_type`,`created_at`),
  CONSTRAINT `string_params_param_id_foreign` FOREIGN KEY (`param_id`) REFERENCES `params` (`id`) ON DELETE CASCADE,
  CONSTRAINT `string_params_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'New Task',
  `description` longtext NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `state` int(11) NOT NULL DEFAULT 0,
  `duration` double(8,2) NOT NULL DEFAULT 0.00,
  `flags` int(10) unsigned NOT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `assignment_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `tasks_parent_id_index` (`parent_id`),
  KEY `tasks_parent_type_index` (`parent_type`),
  KEY `tasks_assignment_id_foreign` (`assignment_id`),
  CONSTRAINT `tasks_assignment_id_foreign` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telescope_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telescope_entries` (
  `sequence` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` char(36) NOT NULL,
  `batch_id` char(36) NOT NULL,
  `family_hash` varchar(255) DEFAULT NULL,
  `should_display_on_index` tinyint(1) NOT NULL DEFAULT 1,
  `type` varchar(20) NOT NULL,
  `content` longtext NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`sequence`),
  UNIQUE KEY `telescope_entries_uuid_unique` (`uuid`),
  KEY `telescope_entries_batch_id_index` (`batch_id`),
  KEY `telescope_entries_family_hash_index` (`family_hash`),
  KEY `telescope_entries_created_at_index` (`created_at`),
  KEY `telescope_entries_type_should_display_on_index_index` (`type`,`should_display_on_index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telescope_entries_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telescope_entries_tags` (
  `entry_uuid` char(36) NOT NULL,
  `tag` varchar(255) NOT NULL,
  PRIMARY KEY (`entry_uuid`,`tag`),
  KEY `telescope_entries_tags_tag_index` (`tag`),
  CONSTRAINT `telescope_entries_tags_entry_uuid_foreign` FOREIGN KEY (`entry_uuid`) REFERENCES `telescope_entries` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `telescope_monitoring`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `telescope_monitoring` (
  `tag` varchar(255) NOT NULL,
  PRIMARY KEY (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `text_params`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `text_params` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `parent_id` int(10) unsigned DEFAULT NULL,
  `parent_type` varchar(255) DEFAULT NULL,
  `param_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `value` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `text_params_user_id_foreign` (`user_id`),
  KEY `text_params_language_index` (`language`),
  KEY `text_params_parent_id_index` (`parent_id`),
  KEY `text_params_parent_type_index` (`parent_type`),
  KEY `text_params_param_id_index` (`param_id`),
  KEY `text_params_param_created_index` (`param_id`,`created_at`),
  KEY `text_params_updated_at_index` (`updated_at`),
  KEY `text_params_param_parent_created_index` (`param_id`,`parent_id`,`parent_type`,`created_at`),
  CONSTRAINT `text_params_param_id_foreign` FOREIGN KEY (`param_id`) REFERENCES `params` (`id`) ON DELETE CASCADE,
  CONSTRAINT `text_params_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `uptime_checks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uptime_checks` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `uptime_monitor_id` int(10) unsigned NOT NULL,
  `checked_at` timestamp NOT NULL,
  `status` enum('up','down','degraded') NOT NULL,
  `response_time` int(11) DEFAULT NULL,
  `status_code` int(11) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `uptime_checks_uptime_monitor_id_checked_at_index` (`uptime_monitor_id`,`checked_at`),
  KEY `uptime_checks_checked_at_index` (`checked_at`),
  CONSTRAINT `uptime_checks_uptime_monitor_id_foreign` FOREIGN KEY (`uptime_monitor_id`) REFERENCES `uptime_monitors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `uptime_monitor_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uptime_monitor_user` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `uptime_monitor_id` int(10) unsigned NOT NULL,
  `user_id` int(10) unsigned NOT NULL,
  `notify_via_email` tinyint(1) NOT NULL DEFAULT 1,
  `notify_via_chat` tinyint(1) NOT NULL DEFAULT 1,
  `notify_on_recovery` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uptime_monitor_user_uptime_monitor_id_user_id_unique` (`uptime_monitor_id`,`user_id`),
  KEY `uptime_monitor_user_user_id_foreign` (`user_id`),
  CONSTRAINT `uptime_monitor_user_uptime_monitor_id_foreign` FOREIGN KEY (`uptime_monitor_id`) REFERENCES `uptime_monitors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `uptime_monitor_user_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `uptime_monitors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `uptime_monitors` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(512) NOT NULL,
  `method` enum('GET','POST','HEAD') NOT NULL DEFAULT 'GET',
  `expected_status_code` int(11) NOT NULL DEFAULT 200,
  `timeout` int(11) NOT NULL DEFAULT 30,
  `response_time_threshold` int(11) NOT NULL DEFAULT 5000,
  `check_interval` int(11) NOT NULL DEFAULT 300,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `request_headers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`request_headers`)),
  `request_body` text DEFAULT NULL,
  `last_check_at` timestamp NULL DEFAULT NULL,
  `last_status` enum('up','down','degraded','pending') NOT NULL DEFAULT 'pending',
  `last_notified_at` timestamp NULL DEFAULT NULL,
  `created_by_user_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `uptime_monitors_created_by_user_id_foreign` (`created_by_user_id`),
  KEY `uptime_monitors_is_active_index` (`is_active`),
  KEY `uptime_monitors_last_check_at_index` (`last_check_at`),
  CONSTRAINT `uptime_monitors_created_by_user_id_foreign` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_employments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_employments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `is_time_based` tinyint(1) NOT NULL DEFAULT 0,
  `started_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `mo` double(4,2) NOT NULL DEFAULT 8.00,
  `tu` double(4,2) NOT NULL DEFAULT 8.00,
  `we` double(4,2) NOT NULL DEFAULT 8.00,
  `th` double(4,2) NOT NULL DEFAULT 8.00,
  `fr` double(4,2) NOT NULL DEFAULT 8.00,
  `sa` double(4,2) NOT NULL DEFAULT 0.00,
  `su` double(4,2) NOT NULL DEFAULT 0.00,
  `hpw` decimal(4,2) GENERATED ALWAYS AS (`mo` + `tu` + `we` + `th` + `fr` + `sa` + `su`) VIRTUAL,
  `user_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_employments_user_id_foreign` (`user_id`),
  CONSTRAINT `user_employments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_paid_times`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_paid_times` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `paid_at` datetime NOT NULL,
  `description` varchar(255) NOT NULL,
  `raw` double(5,2) NOT NULL,
  `vacation` double(10,3) NOT NULL DEFAULT 8.000,
  `total` decimal(5,3) GENERATED ALWAYS AS (`raw` - `vacation`) VIRTUAL,
  `user_id` int(10) unsigned NOT NULL,
  `granted_by_user_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_paid_times_user_id_foreign` (`user_id`),
  KEY `user_paid_times_granted_by_user_id_foreign` (`granted_by_user_id`),
  CONSTRAINT `user_paid_times_granted_by_user_id_foreign` FOREIGN KEY (`granted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_paid_times_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `api_token` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL DEFAULT '#00C9A7',
  `vcard` longtext NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `public_key` text DEFAULT NULL,
  `current_focus_id` int(10) unsigned DEFAULT NULL,
  `current_focus_type` varchar(255) DEFAULT NULL,
  `flags` int(10) unsigned NOT NULL,
  `current_project_id` int(10) unsigned DEFAULT NULL,
  `work_zip` varchar(5) NOT NULL DEFAULT '87435' COMMENT 'ZIP code of workplace for location-specific holidays',
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_current_focus_id_index` (`current_focus_id`),
  KEY `users_current_focus_type_index` (`current_focus_type`),
  KEY `users_current_project_id_foreign` (`current_project_id`),
  CONSTRAINT `users_current_project_id_foreign` FOREIGN KEY (`current_project_id`) REFERENCES `projects` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vacation_grants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vacation_grants` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `expires_at` date NOT NULL,
  `name` varchar(255) NOT NULL,
  `amount` double(10,2) NOT NULL DEFAULT 0.00,
  `user_id` int(10) unsigned NOT NULL COMMENT 'user',
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vacation_grants_user_id_foreign` (`user_id`),
  CONSTRAINT `vacation_grants_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vacations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vacations` (
  `deleted_at` timestamp NULL DEFAULT NULL,
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `comment` varchar(255) NOT NULL DEFAULT '',
  `started_at` date DEFAULT NULL,
  `ended_at` date DEFAULT NULL,
  `approved_at` date DEFAULT NULL,
  `state` int(11) NOT NULL DEFAULT 0,
  `amount` double(10,2) NOT NULL DEFAULT 0.00 COMMENT 'amount of vacation in hours',
  `log` text NOT NULL COMMENT 'This field holds the calculation for the deducted vacation hours, so it can be comprehended later at any time',
  `vacation_grant_id` int(10) unsigned NOT NULL,
  `approved_by_id` int(10) unsigned DEFAULT NULL COMMENT 'approved by user',
  `flags` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `vacations_vacation_grant_id_foreign` (`vacation_grant_id`),
  KEY `vacations_approved_by_id_foreign` (`approved_by_id`),
  KEY `vacations_state_approved_at_index` (`state`,`approved_at`),
  KEY `vacations_started_at_index` (`started_at`),
  KEY `vacations_grant_id_index` (`vacation_grant_id`),
  CONSTRAINT `vacations_approved_by_id_foreign` FOREIGN KEY (`approved_by_id`) REFERENCES `users` (`id`),
  CONSTRAINT `vacations_vacation_grant_id_foreign` FOREIGN KEY (`vacation_grant_id`) REFERENCES `vacation_grants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vaults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaults` (
  `key` varchar(50) NOT NULL DEFAULT '',
  `value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `websockets_statistics_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `websockets_statistics_entries` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `app_id` varchar(255) NOT NULL,
  `peak_connection_count` int(11) NOT NULL,
  `websocket_message_count` int(11) NOT NULL,
  `api_message_count` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'2014_10_12_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'2014_10_12_100000_create_password_reset_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'2014_10_12_100000_create_password_resets_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2014_10_12_100000_create_user_employments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2014_10_12_110000_create_user_paid_time.table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2019_08_19_000000_create_failed_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2019_12_14_000001_create_personal_access_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2020_10_06_113000_create_files_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2020_10_06_113100_create_product_groups_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2020_10_06_113200_create_products_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2020_10_06_113754_create_companies_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2020_10_06_113900_create_contacts_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2020_10_06_114737_create_invoices_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2020_10_06_120000_create_invoice_reminders_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2020_10_07_080230_create_company_contacts_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2020_10_07_080231_create_projects_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2020_11_24_101740_create_comments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2020_11_27_100000_create_invoice_items_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2020_11_27_100001_create_invoice_item_predictions_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2021_05_03_115848_create_foci_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2021_05_03_153351_create_assignment_roles_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2021_05_03_153957_create_assignments_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2021_10_23_000000_create_params_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2021_10_23_100000_create_float_params_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2021_10_23_200000_create_string_params_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2021_10_23_300000_create_text_params_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2022_04_14_081542_create_milestones_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2022_04_14_082259_create_milestone_milestones_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2022_04_14_900000_create_tasks_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'2022_04_20_100000_create_sentinels_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'2022_04_20_200000_create_sentinel_triggers_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2022_04_20_300000_create_sentinel_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'2022_05_05_172016_create_permission_tables',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2023_07_25_085140_create_project_states_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2023_09_07_134146_create_documents_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2024_02_14_162057_create_encryptions_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2024_03_06_100000_create_vacation_grants_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2024_03_06_200000_create_vacations_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39,'2024_03_07_104929_create_plugin_links_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'2024_05_15_170000_create_expense_categories_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (41,'2024_05_15_170238_create_expenses_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (42,'2024_10_28_095619_create_connections_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (43,'2024_10_28_110356_create_connection_projects_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (44,'2024_11_04_185344_create_cash_registers_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (45,'2024_11_04_185443_create_cashes_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (46,'2025_02_13_145254_add_calendar_permissions',2);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (47,'2025_02_14_102710_add_calendar_permissions',3);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (48,'2025_02_13_163358_create_calendar_entries_table',4);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (49,'2025_03_05_151622_add_invoice_cancellation',5);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (50,'2025_03_07_092850_update_encryption_ids',6);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (51,'2025_03_08_112032_add_project_work_estimated_precompute',7);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (52,'2025_03_12_075439_add_product_descriptions',8);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (53,'2025_04_03_203256_add_total_duration_attribute',9);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (54,'0000_00_00_000000_create_websockets_statistics_entries_table',10);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (55,'2025_04_24_164250_add_invoice_download_settings',11);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (56,'2025_05_21_143517_add_projects_lead_probability',12);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (57,'2025_06_08_160712_change_tasks_to_polymorphic',13);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (58,'2025_06_08_164951_add_assignees_to_tasks',14);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (59,'2025_06_12_113539_add_remarketing_to_companies',15);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (60,'2025_06_16_085426_change_project_state_handling',16);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (61,'2025_06_11_141233_add_webdav_token_settings',17);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (62,'2025_06_25_140507_add_ignore_from_prepared_flag_to_projects',18);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (63,'2018_08_08_100000_create_telescope_entries_table',19);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (64,'2025_07_15_073927_create_vaults_table',20);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (65,'2025_07_22_100000_add_database_performance_indexes',21);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (66,'2025_07_28_151807_add_allocated_time_and_hr_permission',22);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (67,'2025_07_28_161443_add_hr_can_allocate_time_permission',23);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (68,'2025_08_08_153932_add_work_zip_to_users_table',24);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (69,'2025_08_09_120218_add_indexes_to_vacations_table',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (70,'2025_08_09_121041_add_param_history_indexes',25);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (71,'2025_08_09_194335_add_indexes_to_timestamps',26);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (72,'2025_09_18_151929_add_marketing_fields_to_files_table',27);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (73,'2025_09_19_112501_create_invoice_item_milestone_table',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (74,'2025_09_19_112523_add_timeline_fields_to_milestones_table',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (75,'2025_09_19_183546_add_position_to_milestones_table',28);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (76,'2025_09_20_091827_add_user_id_to_milestones_table',29);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (77,'2025_09_25_184014_restructure_foci_table_item_focus_to_invoice_item',30);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (78,'2025_09_26_083727_add_invoiced_in_item_id_to_foci_table',31);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (79,'2025_09_30_000001_create_frameworks_table',32);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (80,'2025_09_30_000002_add_framework_columns_to_plugin_links_table',32);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (81,'2025_09_30_194315_refine_frameworks_table',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (82,'2025_09_30_201732_add_macos_framework',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (83,'2025_09_30_203118_add_is_deprecated_to_plugin_links',33);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (84,'2025_10_14_000001_create_marketing_initiatives_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (85,'2025_10_14_000002_create_initiative_channels_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (86,'2025_10_14_000003_create_performance_metrics_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (87,'2025_10_14_000004_create_engagement_workflows_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (88,'2025_10_14_000005_create_engagement_activities_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (89,'2025_10_14_000006_create_prospects_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (90,'2025_10_14_000007_create_prospect_activities_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (91,'2025_10_14_000008_create_marketing_initiative_user_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (92,'2025_10_14_000009_create_marketing_initiative_workflow_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (93,'2025_10_14_000010_create_marketing_initiative_metric_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (94,'2025_10_14_000011_create_marketing_activity_metric_table',34);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (95,'2025_10_17_222741_add_branching_to_marketing_activities_table',35);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (96,'2025_10_19_180406_add_vcard_to_marketing_prospects_table',36);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (97,'2025_10_19_203037_add_company_relations_to_marketing_prospects_table',36);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (98,'2025_10_24_155543_add_lead_probability_argumentation_to_projects_table',37);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (99,'2025_10_27_125029_add_days_skipped_to_marketing_prospects_table',38);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (100,'2025_11_21_000000_add_trigger_variable_to_sentinels_table',39);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (101,'2025_12_07_104615_create_i18n_table',40);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (102,'2025_12_16_100000_create_uptime_monitors_table',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (103,'2025_12_16_100001_create_uptime_checks_table',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (104,'2025_12_16_100002_create_project_uptime_monitor_table',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (105,'2025_12_16_100003_create_uptime_monitor_user_table',41);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (106,'2026_01_15_080900_add_marker_attribute_to_invoice_items',42);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (107,'2026_01_15_083928_add_marker_attribute_to_foci',43);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (108,'2026_01_21_100000_add_projects_edit_milestones_permission',44);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (109,'2026_01_28_085325_add_comments_to_milestones',45);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (110,'2026_01_29_160253_add_quick_action_to_marketing_activities_table',46);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (111,'2026_02_04_000001_create_debrief_problem_categories_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (112,'2026_02_04_000002_create_debrief_problems_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (113,'2026_02_04_000003_create_debrief_solutions_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (114,'2026_02_04_000004_create_debrief_project_debriefs_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (115,'2026_02_04_000005_create_debrief_problem_project_debrief_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (116,'2026_02_04_000006_create_debrief_problem_solution_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (117,'2026_02_04_000007_create_debrief_positives_table',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (118,'2026_02_04_000008_seed_debrief_problem_categories',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (119,'2026_02_05_080400_add_link_to_tasks',47);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (120,'2026_02_11_120000_make_vacation_grant_id_nullable_on_vacations',48);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (121,'2026_02_20_000001_update_debrief_project_debriefs_for_multi_debrief',49);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (122,'2026_03_01_000001_refactor_workflows_as_templates',50);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (123,'2026_03_05_000001_seed_default_payment_plan_tiers',51);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (124,'2026_03_07_000001_restructure_roles_to_rbac',52);
