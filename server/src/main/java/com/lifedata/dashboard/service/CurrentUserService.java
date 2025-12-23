package com.lifedata.dashboard.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.lifedata.dashboard.model.UserAccount;
import com.lifedata.dashboard.repository.UserAccountRepository;

@Component
public class CurrentUserService {

    private final UserAccountRepository userRepository;

    public CurrentUserService(UserAccountRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserAccount currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalStateException("Unauthenticated");
        }
        return userRepository.findByEmail(authentication.getName()).orElseThrow();
    }
}
