package com.lifedata.dashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LifeDashboardApplication {

	public static void main(String[] args) {
		SpringApplication.run(LifeDashboardApplication.class, args);
	}

}
