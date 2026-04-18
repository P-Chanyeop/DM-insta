package com.instabot.backend.dto.flow;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowEdge {
    private String id;
    private String source;
    private String target;
    private String sourceHandle;
}
