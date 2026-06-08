
## 백엔드 코드 작성 지침

- 코드를 작성할 때는 클린 코드를 지향해주세요. 
- 공통화가 가능한 로직이 있다면 공통화를 지향해주세요. 확장성을 확보하기 위함입니다.
- *패키지 구조를 설계해야 할때는 사용자에게 우선적으로 MVC 패턴과 DDD 패턴 중 어떤 패턴을 사용할 지 질의합니다.*
    - MVC 패턴의 경우, `config/controller/domain/service/repository` 를 기본적으로 사용하며, 사용자에게 한번 더 확인합니다.
    - DDD 패턴의 경우, `application / attribute / config / domain / event / infrastructure / interfaces` 를 기본적으로 사용하며, 사용자에게 한번 더 확인합니다.
- 에러 코드는 공통화해서 사용합니다. 아래의 Enum 코드를 참고하세요. 
```java
@AllArgsConstructor
@Getter
public enum ErrorCode {

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
```
- 클라이언트 응답은 아래의 클래스를 이용하여 응답합니다. 제네릭으로 각 컨트롤러의 기능별 Response 객체를 함께 Data에 넣어서 응답하도록 합니다.
```java
import com.enls.cohhee.global.error.ErrorCode;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommonResponse {

    @JsonIgnore
    private static final String MESSAGE_SUCCESS = "SUCCESS";

    @Schema(description = "성공이면 0, 그 이외에는 모두 에러에맞는 코드값 반환")
    private String code;
    @Schema(description = "성공이면 SUCCESS 실패에 맞는 message 반환")
    private String message;


    public static CommonResponse success() {
        return CommonResponse.builder()
                .code("0")
                .message(MESSAGE_SUCCESS)
                .build();
    }

    @SuppressWarnings("unchecked")
    public static <T> CommonResponse.CommonData<T> success(T data) {
        return (CommonData<T>)CommonResponse.CommonData.builder()
                .code("0")
                .message(MESSAGE_SUCCESS)
                .data(data)
                .build();
    }

    public static <T> CommonResponse.CommonList<T> success(Page<T> list) {
        return new CommonList<>("0", MESSAGE_SUCCESS, list);
    }

    public static <T> CommonResponse.CommonList<T> success(List<T> list) {
        return new CommonList<>("0", MESSAGE_SUCCESS, list);
    }

    @SuppressWarnings("unchecked")
    public static <T> ResponseEntity<T> fail(ErrorCode errorCode) {
        return (ResponseEntity<T>)ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(CommonResponse.builder()
                        .code(errorCode.getCode())
                        .message(errorCode.getMessage())
                        .build()
                );
    }

    @SuppressWarnings("unchecked")
    public static <T> ResponseEntity<T> failValid(ErrorCode errorCode, String message) {
        return (ResponseEntity<T>)ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(CommonResponse.builder()
                .code(errorCode.getCode())
                .message(message)
                .build()
            );
    }


    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommonData<T> {
        @Schema(description = "성공이면 0, 그 이외에는 모두 에러에맞는 코드값 반환")
        private String code;
        @Schema(description = "성공이면 SUCCESS 실패에 맞는 message 반환")
        private String message;
        @Schema(description = "성공했을시 반환. (성공한 결과의 단일 조회일경우)")
        private T data;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CommonList<T> {
        @Schema(description = "성공이면 0, 그 이외에는 모두 에러에맞는 코드값 반환")
        private String code;
        @Schema(description = "성공이면 SUCCESS 실패에 맞는 message 반환 ")
        private String message;
        @Schema(description = "성공했을시 반환. (성공한 결과의 목록 조회일 경우)")
        private List<T> list;
        @JsonProperty(value = "page_number")
        private int pageNumber;
        @JsonProperty(value = "page_size")
        private int pageSize;
        @JsonProperty(value = "total_count")
        private Long totalCount;
        @JsonProperty(value = "total_page")
        private int totalPage;

        CommonList(String code, String message, Page<T> list) {
            this.code = code;
            this.message = message;
            this.list = list.getContent();
            this.pageNumber = list.getNumber() + 1;
            this.pageSize = list.getSize();
            this.totalCount = list.getTotalElements();
            this.totalPage = list.getTotalPages();
        }

        CommonList(String code, String message, List<T> list) {
            this.code = code;
            this.message = message;
            this.list = list;
        }
    }
}
```
- 테스트 코드를 작성할 때는 Given / When / Then 주석 패턴을 사용하세요.

### DTO 객체 클래스 및 필드 컨벤션
- 레이어들 간의 DTO 객체의 명칭을 확실하게 맞추세요.
    - DDD 패턴을 사용한다면, interfaces 레이어의 DTO는 Request / Response , Application 레이어의 DTO는 Command / Result 로 작성할 것.
        - ex) FooBarRequest / FooBarReseponse / FooBarCommand / FooBarResult
    - MVC 패턴을 사용한다면, controller 레이어의 DTO는 Request / Response , Service 레이어의 DTO는 필요에 따라 생성
- DTO 클래스가 과도하게 늘어나는 것을 방지하기 위하여 각 기능 별 상세 DTO들은 도메인 별 상위 DTO 클래스 내부에 static 클래스로 만드세요.
    - 각 기능 별로 사용되는 static DTO 클래스는 최대한 controller 메서드 명과 통일해서 사용할 것. 중간에 바뀔 경우 DTO 가 늘어날 때 이를 추적하기 어렵기 때문임. 
    - DDD 패턴의 경우도 마찬가지로 Command / Result 에 동일한 규칙을 적용할 것.
    - 따라서 최종적으로는 각 도메인 별 / 레이어 별 상위 DTO 객체 하위에 기능별로 static class 들이 생성되는 구조를 갖게 될 것임. 
- DTO 클래스 내부 필드에서 id 필드가 추가될 경우 도메인 명을 포함해주세요. (id -> entityId) 추후 필드가 추가될 때를 대비하여 명확한 필드 명을 정의하기 위함입니다.
- 클라이언트와의 통신에 사용되는 필드들은 `@JsonProperty`를 사용해 Snake Case를 사용하세요.
```java
// Controller
public class CoffeeBeanController {
    @Operation(summary = "신규 싱글 오리진 원두 등록 요청", description = "신규 싱글 오리진 원두를 등록한다.")
    @PostMapping("/single/bean")
    public CommonResponse.CommonData<CoffeeBeanResponse.CreateSingleBean> createSingleBean(
            @RequestBody @Valid CoffeeBeanRequest.CreateSingleBean createSingleBean) {
        return CommonResponse.success(CoffeeBeanResponse.CreateSingleBean.of(
                singleBeanService.createSingleBean(CoffeeBeanRequest.CreateSingleBean.toDTO(createSingleBean))));
    }
}

// Request 
public class CoffeeBeanRequest {

    @Getter
    @Builder
    @ToString
    @Schema(name = "싱글 오리진 원두 등록 정보")
    @NoArgsConstructor @AllArgsConstructor
    public static class CreateSingleBean {

        @NotEmpty
        @Schema(description = "원두 명", example = "구지 알라카 와인 프로세스")
        @JsonProperty(value = "name")
        private String name;

        @Schema(description = "원산지 - 국가", example = "케냐")
        @JsonProperty(value = "country")
        private String country;

        @Schema(description = "원산지 - 지역", example = "서울")
        @JsonProperty(value = "region")
        private String region;

        @Schema(description = "품종", example = "Bourbon")
        @JsonProperty(value = "variety")
        private String variety;

        @Schema(description = "프로세스", example = "Red Honey")
        @JsonProperty(value = "process")
        private String process;

        @Schema(description = "코멘트 정보", example = "내 최애 싱글 오리진 원두")
        @JsonProperty(value = "comment")
        private String comment;

        @Schema(description = "로스팅 정보", example = "라이트")
        @JsonProperty(value = "roasting")
        private String roasting;

        @ValidFlavor
        @Schema(description = "Flavor Wheel 아이디 리스트 목록", example = "[1, 2, 3]")
        @JsonProperty(value = "flavor_wheel_id_list")
        private List<Long> flavorWheelIdList;

        @Schema(description = "리소스 아이디 리스트 목록", example = "[10, 11]")
        @JsonProperty(value = "resource_id_list")
        private List<Long> resourceIdList;

        public static SingleBeanRequestDTO.CreateSingleBean toDTO(CreateSingleBean createSingleBean) {
            return SingleBeanRequestDTO.CreateSingleBean.builder()
                    .name(createSingleBean.getName())
                    .country(createSingleBean.getCountry())
                    .region(createSingleBean.getRegion())
                    .variety(createSingleBean.getVariety())
                    .process(createSingleBean.getProcess())
                    .comment(createSingleBean.getComment())
                    .roasting(createSingleBean.getRoasting())
                    .flavorWheelIdList(createSingleBean.getFlavorWheelIdList())
                    .resourceIdList(createSingleBean.getResourceIdList())
                    .build();
        }
    }
}

// Response
public class CoffeeBeanResponse {

    @Getter
    @Builder
    @ToString
    @Schema(name = "싱글 오리진 원두 등록 성공 응답 객체")
    public static class CreateSingleBean {

        @Schema(description = "싱글 오리진 원두 ID", example = "1000")
        @JsonProperty(value = "single_bean_id")
        private Long singleBeanId;

        @Schema(description = "원두 명", example = "구지 알라카 와인 프로세스")
        @JsonProperty(value = "name")
        private String name;

        @Schema(description = "원산지 - 국가", example = "케냐")
        @JsonProperty(value = "country")
        private String country;

        @Schema(description = "원산지 - 지역", example = "서울")
        @JsonProperty(value = "region")
        private String region;

        @Schema(description = "품종", example = "Bourbon")
        @JsonProperty(value = "variety")
        private String variety;

        @Schema(description = "프로세스", example = "Red Honey")
        @JsonProperty(value = "process")
        private String process;

        @Schema(description = "코멘트 정보", example = "내 최애 싱글 오리진 원두")
        @JsonProperty(value = "comment")
        private String comment;

        @Schema(description = "로스팅 정보", example = "미디엄")
        @JsonProperty(value = "roasting")
        private String roasting;

        @Schema(description = "플레이버 휠 아이디 리스트", example = "[1, 2, 3]")
        @JsonProperty(value = "flavor_wheel_id_list")
        private List<Long> flavorWheelIdList;

        @Schema(description = "리소스 아이디 리스트 목록", example = "[10, 11]")
        @JsonProperty(value = "resource_id_list")
        private List<Long> resourceIdList;

        public static CreateSingleBean of(SingleBeanResponseDTO.CreateSingleBean createSingleBean) {
            return CreateSingleBean.builder()
                    .singleBeanId(createSingleBean.getSingleBeanId())
                    .name(createSingleBean.getName())
                    .country(createSingleBean.getCountry())
                    .region(createSingleBean.getRegion())
                    .variety(createSingleBean.getVariety())
                    .process(createSingleBean.getProcess())
                    .comment(createSingleBean.getComment())
                    .roasting(createSingleBean.getRoasting())
                    .flavorWheelIdList(createSingleBean.getFlavorWheelIdList())
                    .resourceIdList(createSingleBean.getResourceIdList())
                    .build();
        }
    }
}
```

### API Doc
- API 문서는 스웨거를 사용합니다.
- 스웨거는 상세하게 작성합니다.
    - Controller 의 `@Operation`은 summary, description (상세하게), response 를 모두 명시합니다. response는 아래 OpenApiConfig 를 참고하세요.
    - Request / Response에 `@Schema`는 description, example, nullable(true인 경우) 를 모두 명시합니다.
```java
@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        SecurityScheme securityScheme = new SecurityScheme()
                .name(SECURITY_SCHEME_NAME)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .in(SecurityScheme.In.HEADER);

        return new OpenAPI().info(new Info()
                .title("CDRI Book API")
                .version("v1")
                .description("카테고리 기반 도서 관리 API"))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, securityScheme)
                        .addResponses("BadRequestCommon", commonErrorResponse(
                                "요청 값 검증 실패",
                                "badRequestExample",
                                "E4000",
                                "요청 값이 올바르지 않습니다."
                        ))
                        .addResponses("UnauthorizedCommon", commonErrorResponse(
                                "인증 실패",
                                "unauthorizedExample",
                                "E4011",
                                "이메일 또는 비밀번호가 올바르지 않습니다."
                        ))
                        .addResponses("ForbiddenCommon", commonErrorResponse(
                                "권한 부족",
                                "forbiddenExample",
                                "E4030",
                                "접근 권한이 없습니다."
                        ))
                        .addResponses("NotFoundCommon", commonErrorResponse(
                                "리소스를 찾을 수 없음",
                                "notFoundExample",
                                "E4042",
                                "도서를 찾을 수 없습니다."
                        ))
                        .addResponses("ConflictCommon", commonErrorResponse(
                                "중복/충돌",
                                "conflictExample",
                                "E4090",
                                "이미 가입된 이메일입니다."
                        ))
                        .addResponses("InternalServerErrorCommon", commonErrorResponse(
                                "서버 내부 오류",
                                "internalServerErrorExample",
                                "E5000",
                                "서버 내부 오류가 발생했습니다."
                        )))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME));
    }

    private ApiResponse commonErrorResponse(String description, String exampleName, String code, String message) {
        Example example = new Example()
                .summary(description)
                .value(Map.of("code", code, "message", message));

        MediaType mediaType = new MediaType()
                .schema(commonErrorResponseSchema())
                .addExamples(exampleName, example);

        return new ApiResponse()
                .description(description)
                .content(new Content().addMediaType("application/json", mediaType));
    }

    private Schema<?> commonErrorResponseSchema() {
        return new ObjectSchema()
                .addProperty("code", new StringSchema().example("E4000").description("에러 코드"))
                .addProperty("message", new StringSchema().example("요청 값이 올바르지 않습니다.").description("에러 메시지"));
    }
}
```