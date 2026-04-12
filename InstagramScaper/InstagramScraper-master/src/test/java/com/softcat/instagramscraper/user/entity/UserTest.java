package com.softcat.instagramscraper.user.entity;

import com.softcat.instagramscraper.common.util.SubscriptionPlan;
import com.softcat.instagramscraper.common.util.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;

@DisplayName("User 엔티티 테스트")
class UserTest {
    
    private PasswordEncoder passwordEncoder;
    private User user;
    
    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        user = User.builder()
                .email("test@example.com")
                .password("rawPassword123")
                .name("테스트유저")
                .role(UserRole.USER)
                .subscriptionPlan(SubscriptionPlan.FREE)
                .build();
    }
    
    @Nested
    @DisplayName("사용자 생성 테스트")
    class UserCreationTest {
        
        @Test
        @DisplayName("정상적인 사용자 생성")
        void 정상적인_사용자_생성() {
            // given & when
            User newUser = User.builder()
                    .email("new@example.com")
                    .password("password123")
                    .name("신규유저")
                    .role(UserRole.USER)
                    .subscriptionPlan(SubscriptionPlan.BASIC)
                    .build();
            
            // then
            assertThat(newUser.getEmail()).isEqualTo("new@example.com");
            assertThat(newUser.getName()).isEqualTo("신규유저");
            assertThat(newUser.getRole()).isEqualTo(UserRole.USER);
            assertThat(newUser.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.BASIC);
            assertThat(newUser.getSearchCount()).isEqualTo(0);
            assertThat(newUser.getIsActive()).isTrue();
        }
        
        @Test
        @DisplayName("기본값으로 사용자 생성 (role, plan null)")
        void 기본값으로_사용자_생성() {
            // given & when
            User defaultUser = User.builder()
                    .email("default@example.com")
                    .password("password123")
                    .name("기본유저")
                    .build();
            
            // then
            assertThat(defaultUser.getRole()).isEqualTo(UserRole.USER);
            assertThat(defaultUser.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.FREE);
            assertThat(defaultUser.getSearchCount()).isEqualTo(0);
            assertThat(defaultUser.getIsActive()).isTrue();
        }
        
        @Test
        @DisplayName("관리자 사용자 생성")
        void 관리자_사용자_생성() {
            // given & when
            User adminUser = User.builder()
                    .email("admin@example.com")
                    .password("adminPassword")
                    .name("관리자")
                    .role(UserRole.ADMIN)
                    .subscriptionPlan(SubscriptionPlan.ENTERPRISE)
                    .build();
            
            // then
            assertThat(adminUser.getRole()).isEqualTo(UserRole.ADMIN);
            assertThat(adminUser.isAdmin()).isTrue();
        }
    }
    
    @Nested
    @DisplayName("비밀번호 관리 테스트")
    class PasswordManagementTest {
        
        @Test
        @DisplayName("비밀번호 암호화 성공")
        void 비밀번호_암호화_성공() {
            // given
            String originalPassword = user.getPassword();
            
            // when
            user.encodePassword(passwordEncoder);
            
            // then
            assertThat(user.getPassword()).isNotEqualTo(originalPassword);
            assertThat(user.getPassword()).startsWith("$2a$"); // BCrypt 해시 패턴
        }
        
        @Test
        @DisplayName("비밀번호 검증 성공")
        void 비밀번호_검증_성공() {
            // given
            String rawPassword = "rawPassword123";
            user.encodePassword(passwordEncoder);
            
            // when & then
            assertThat(user.isPasswordMatch(rawPassword, passwordEncoder)).isTrue();
        }
        
        @Test
        @DisplayName("잘못된 비밀번호 검증 실패")
        void 잘못된_비밀번호_검증_실패() {
            // given
            user.encodePassword(passwordEncoder);
            
            // when & then
            assertThat(user.isPasswordMatch("wrongPassword", passwordEncoder)).isFalse();
        }
        
        @Test
        @DisplayName("빈 비밀번호 검증 실패")
        void 빈_비밀번호_검증_실패() {
            // given
            user.encodePassword(passwordEncoder);
            
            // when & then
            assertThat(user.isPasswordMatch("", passwordEncoder)).isFalse();
            assertThat(user.isPasswordMatch(null, passwordEncoder)).isFalse();
        }
    }
    
    @Nested
    @DisplayName("검색 기능 테스트")
    class SearchFunctionalityTest {
        
        @Test
        @DisplayName("무제한 플랜 검색 가능")
        void 무제한_플랜_검색_가능() {
            // given
            user.upgradeSubscriptionPlan(SubscriptionPlan.ENTERPRISE);
            for (int i = 0; i < 1000; i++) {
                user.incrementSearchCount();
            }
            
            // when & then
            assertThat(user.canSearch(-1)).isTrue(); // -1은 무제한
        }
        
        @Test
        @DisplayName("제한된 플랜 검색 가능")
        void 제한된_플랜_검색_가능() {
            // given
            int searchLimit = 100;
            
            // when & then
            assertThat(user.canSearch(searchLimit)).isTrue();
        }
        
        @Test
        @DisplayName("검색 제한 초과")
        void 검색_제한_초과() {
            // given
            int searchLimit = 10;
            for (int i = 0; i < 10; i++) {
                user.incrementSearchCount();
            }
            
            // when & then
            assertThat(user.canSearch(searchLimit)).isFalse();
        }
        
        @Test
        @DisplayName("검색 횟수 증가")
        void 검색_횟수_증가() {
            // given
            int initialCount = user.getSearchCount();
            
            // when
            user.incrementSearchCount();
            user.incrementSearchCount();
            
            // then
            assertThat(user.getSearchCount()).isEqualTo(initialCount + 2);
        }
    }
    
    @Nested
    @DisplayName("구독 플랜 관리 테스트")
    class SubscriptionPlanTest {
        
        @Test
        @DisplayName("구독 플랜 업그레이드 성공")
        void 구독_플랜_업그레이드_성공() {
            // given
            user.incrementSearchCount();
            user.incrementSearchCount();
            assertThat(user.getSearchCount()).isEqualTo(2);
            
            // when
            user.upgradeSubscriptionPlan(SubscriptionPlan.PRO);
            
            // then
            assertThat(user.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.PRO);
            assertThat(user.getSearchCount()).isEqualTo(0); // 검색 횟수 초기화
        }
        
        @Test
        @DisplayName("동일한 플랜으로 변경")
        void 동일한_플랜으로_변경() {
            // given
            user.incrementSearchCount();
            SubscriptionPlan currentPlan = user.getSubscriptionPlan();
            
            // when
            user.upgradeSubscriptionPlan(currentPlan);
            
            // then
            assertThat(user.getSubscriptionPlan()).isEqualTo(currentPlan);
            assertThat(user.getSearchCount()).isEqualTo(0); // 여전히 초기화됨
        }
        
        @Test
        @DisplayName("플랜 다운그레이드")
        void 플랜_다운그레이드() {
            // given
            user.upgradeSubscriptionPlan(SubscriptionPlan.ENTERPRISE);
            user.incrementSearchCount();
            
            // when
            user.upgradeSubscriptionPlan(SubscriptionPlan.BASIC);
            
            // then
            assertThat(user.getSubscriptionPlan()).isEqualTo(SubscriptionPlan.BASIC);
            assertThat(user.getSearchCount()).isEqualTo(0);
        }
    }
    
    @Nested
    @DisplayName("계정 상태 관리 테스트")
    class AccountStatusTest {
        
        @Test
        @DisplayName("계정 활성화")
        void 계정_활성화() {
            // given
            user.deactivate();
            assertThat(user.getIsActive()).isFalse();
            
            // when
            user.activate();
            
            // then
            assertThat(user.getIsActive()).isTrue();
        }
        
        @Test
        @DisplayName("계정 비활성화")
        void 계정_비활성화() {
            // given
            assertThat(user.getIsActive()).isTrue();
            
            // when
            user.deactivate();
            
            // then
            assertThat(user.getIsActive()).isFalse();
        }
        
        @Test
        @DisplayName("로그인 시간 업데이트")
        void 로그인_시간_업데이트() {
            // given
            LocalDateTime beforeLogin = LocalDateTime.now().minusMinutes(1);
            
            // when
            user.updateLastLoginAt();
            
            // then
            assertThat(user.getLastLoginAt()).isAfter(beforeLogin);
            assertThat(user.getLastLoginAt()).isBefore(LocalDateTime.now().plusSeconds(1));
        }
    }
    
    @Nested
    @DisplayName("JWT 토큰 관리 테스트")
    class JwtTokenTest {
        
        @Test
        @DisplayName("Refresh Token 설정")
        void refresh_token_설정() {
            // given
            String refreshToken = "sample.refresh.token";
            LocalDateTime expiresAt = LocalDateTime.now().plusDays(7);
            
            // when
            user.updateRefreshToken(refreshToken, expiresAt);
            
            // then
            assertThat(user.getRefreshToken()).isEqualTo(refreshToken);
            assertThat(user.getRefreshTokenExpiresAt()).isEqualTo(expiresAt);
        }
        
        @Test
        @DisplayName("Refresh Token 만료 확인 - 유효한 토큰")
        void refresh_token_만료_확인_유효한_토큰() {
            // given
            LocalDateTime futureTime = LocalDateTime.now().plusDays(1);
            user.updateRefreshToken("token", futureTime);
            
            // when & then
            assertThat(user.isRefreshTokenExpired()).isFalse();
        }
        
        @Test
        @DisplayName("Refresh Token 만료 확인 - 만료된 토큰")
        void refresh_token_만료_확인_만료된_토큰() {
            // given
            LocalDateTime pastTime = LocalDateTime.now().minusDays(1);
            user.updateRefreshToken("token", pastTime);
            
            // when & then
            assertThat(user.isRefreshTokenExpired()).isTrue();
        }
        
        @Test
        @DisplayName("Refresh Token 만료 확인 - null 토큰")
        void refresh_token_만료_확인_null_토큰() {
            // given
            user.updateRefreshToken("token", null);
            
            // when & then
            assertThat(user.isRefreshTokenExpired()).isTrue();
        }
        
        @Test
        @DisplayName("Refresh Token 삭제")
        void refresh_token_삭제() {
            // given
            user.updateRefreshToken("token", LocalDateTime.now().plusDays(1));
            assertThat(user.getRefreshToken()).isNotNull();
            
            // when
            user.clearRefreshToken();
            
            // then
            assertThat(user.getRefreshToken()).isNull();
            assertThat(user.getRefreshTokenExpiresAt()).isNull();
        }
    }
    
    @Nested
    @DisplayName("권한 확인 테스트")
    class AuthorityTest {
        
        @Test
        @DisplayName("일반 사용자 권한 확인")
        void 일반_사용자_권한_확인() {
            // given
            User normalUser = User.builder()
                    .email("user@example.com")
                    .password("password")
                    .name("일반유저")
                    .role(UserRole.USER)
                    .build();
            
            // when & then
            assertThat(normalUser.isAdmin()).isFalse();
        }
        
        @Test
        @DisplayName("관리자 권한 확인")
        void 관리자_권한_확인() {
            // given
            User adminUser = User.builder()
                    .email("admin@example.com")
                    .password("password")
                    .name("관리자")
                    .role(UserRole.ADMIN)
                    .build();
            
            // when & then
            assertThat(adminUser.isAdmin()).isTrue();
        }
    }
    
    @Nested
    @DisplayName("엣지 케이스 테스트")
    class EdgeCaseTest {
        
        @Test
        @DisplayName("검색 횟수 0일 때 제한 확인")
        void 검색_횟수_0일때_제한_확인() {
            // given
            assertThat(user.getSearchCount()).isEqualTo(0);
            
            // when & then
            assertThat(user.canSearch(0)).isFalse(); // 제한이 0이면 검색 불가
            assertThat(user.canSearch(1)).isTrue();  // 제한이 1이면 검색 가능
        }
        
        @Test
        @DisplayName("검색 횟수 경계값 테스트")
        void 검색_횟수_경계값_테스트() {
            // given
            int limit = 5;
            
            // 4번 검색 (제한 내)
            for (int i = 0; i < 4; i++) {
                user.incrementSearchCount();
            }
            assertThat(user.canSearch(limit)).isTrue();
            
            // 5번째 검색 (제한 도달)
            user.incrementSearchCount();
            assertThat(user.canSearch(limit)).isFalse();
        }
        
        @Test
        @DisplayName("대량 검색 횟수 증가")
        void 대량_검색_횟수_증가() {
            // given & when
            for (int i = 0; i < 10000; i++) {
                user.incrementSearchCount();
            }
            
            // then
            assertThat(user.getSearchCount()).isEqualTo(10000);
        }
    }
}
