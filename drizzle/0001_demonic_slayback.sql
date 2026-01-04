CREATE TABLE `boatrace_beforeinfo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_date` date NOT NULL,
	`stadium_code` varchar(2) NOT NULL,
	`race_number` int NOT NULL,
	`lane` int NOT NULL,
	`racer_no` varchar(4),
	`exhibition_time` decimal(5,2),
	`tilt` decimal(3,1),
	`parts_changed` text,
	`start_exhibition` decimal(4,2),
	`scraped_at` timestamp NOT NULL,
	CONSTRAINT `boatrace_beforeinfo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `odds_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_date` date NOT NULL,
	`stadium_code` varchar(2) NOT NULL,
	`race_number` int NOT NULL,
	`odds_type` varchar(10) NOT NULL,
	`combination` varchar(10) NOT NULL,
	`odds_value` decimal(10,2),
	`scraped_at` timestamp NOT NULL,
	`minutes_to_deadline` int,
	CONSTRAINT `odds_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prediction_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prediction_id` int,
	`race_date` date NOT NULL,
	`stadium_code` varchar(2) NOT NULL,
	`race_number` int NOT NULL,
	`source` varchar(50) NOT NULL,
	`is_hit` int,
	`payout` decimal,
	`checked_at` timestamp,
	CONSTRAINT `prediction_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `racer_period_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`racer_no` varchar(4) NOT NULL,
	`data_year` int NOT NULL,
	`data_period` int NOT NULL,
	`name_kanji` varchar(20),
	`name_kana` varchar(40),
	`branch` varchar(10),
	`rank` varchar(2),
	`birth_year` int,
	`gender` varchar(2),
	`weight` int,
	`win_rate` decimal(5,2),
	`double_rate` decimal(5,2),
	`avg_st` decimal(4,2),
	`race_count` int,
	`rank1_count` int,
	`rank2_count` int,
	CONSTRAINT `racer_period_stats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stadium_rankings_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ranking_type` varchar(50) NOT NULL,
	`rank` int NOT NULL,
	`stadium_name` varchar(20),
	`value` decimal(10,2),
	`scraped_at` timestamp NOT NULL,
	CONSTRAINT `stadium_rankings_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boatrace_weather` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_date` date NOT NULL,
	`stadium_code` varchar(2) NOT NULL,
	`race_number` int NOT NULL,
	`temperature` decimal(4,1),
	`weather` varchar(20),
	`wind_direction` varchar(10),
	`wind_speed` int,
	`water_temperature` decimal(4,1),
	`wave_height` int,
	`scraped_at` timestamp NOT NULL,
	CONSTRAINT `boatrace_weather_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `web_predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`race_date` date NOT NULL,
	`stadium_code` varchar(2) NOT NULL,
	`race_number` int NOT NULL,
	`source` varchar(50) NOT NULL,
	`prediction_type` varchar(20),
	`prediction` text,
	`confidence` int,
	`scraped_at` timestamp NOT NULL,
	CONSTRAINT `web_predictions_id` PRIMARY KEY(`id`)
);
