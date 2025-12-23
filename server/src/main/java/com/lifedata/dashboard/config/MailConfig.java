package com.lifedata.dashboard.config;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.io.InputStream;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSender;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessagePreparator;

@Configuration
public class MailConfig {

    @Bean
    @ConditionalOnMissingBean(JavaMailSender.class)
    public JavaMailSender noopMailSender() {
        return new NoOpMailSender();
    }

    /**
     * Fallback mail sender so tests and dev envs boot without SMTP configuration.
     * Emits warnings but does not attempt network IO.
     */
    static class NoOpMailSender implements JavaMailSender, MailSender {
        private static final Logger log = LoggerFactory.getLogger(NoOpMailSender.class);

        @Override
        public MimeMessage createMimeMessage() {
            return new MimeMessage(Session.getInstance(new Properties()));
        }

        @Override
        public MimeMessage createMimeMessage(InputStream contentStream) {
            try {
                return new MimeMessage(Session.getInstance(new Properties()), contentStream);
            } catch (Exception ex) {
                throw new IllegalStateException("Failed to create mime message", ex);
            }
        }

        @Override
        public void send(MimeMessage mimeMessage) throws MailException {
            warn();
        }

        @Override
        public void send(MimeMessage... mimeMessages) throws MailException {
            warn();
        }

        @Override
        public void send(MimeMessagePreparator mimeMessagePreparator) throws MailException {
            warn();
        }

        @Override
        public void send(MimeMessagePreparator... mimeMessagePreparators) throws MailException {
            warn();
        }

        @Override
        public void send(SimpleMailMessage simpleMessage) throws MailException {
            warn();
        }

        @Override
        public void send(SimpleMailMessage... simpleMessages) throws MailException {
            warn();
        }

        private void warn() {
            log.warn("JavaMailSender is not configured; skipping email send.");
        }
    }
}