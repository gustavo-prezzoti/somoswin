package com.backend.winai;

import com.backend.winai.config.DotEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
@org.springframework.scheduling.annotation.EnableAsync
@org.springframework.data.jpa.repository.config.EnableJpaRepositories(basePackages = "com.backend.winai.repository")
public class WinaiApplication {

	public static void main(String[] args) {
		DotEnvLoader.load();
		SpringApplication.run(WinaiApplication.class, args);
	}

}
