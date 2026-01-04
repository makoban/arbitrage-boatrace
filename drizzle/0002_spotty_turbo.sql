CREATE TABLE `odds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_id` int NOT NULL,
	`scraped_at` timestamp NOT NULL,
	`odds_type` varchar(20) NOT NULL,
	`combination` varchar(20) NOT NULL,
	`odds_value` decimal(10,2),
	`odds_min` decimal(10,2),
	`odds_max` decimal(10,2),
	CONSTRAINT `odds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_id` int NOT NULL,
	`bet_type` varchar(20) NOT NULL,
	`combination` varchar(20) NOT NULL,
	`payoff` int NOT NULL,
	`popularity` int,
	CONSTRAINT `payoffs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `race_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_id` int NOT NULL,
	`first_place` int,
	`second_place` int,
	`third_place` int,
	`fourth_place` int,
	`fifth_place` int,
	`sixth_place` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `race_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `races` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_date` date NOT NULL,
	`stadium_code` int NOT NULL,
	`race_number` int NOT NULL,
	`title` varchar(100),
	`deadline_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `races_id` PRIMARY KEY(`id`)
);
