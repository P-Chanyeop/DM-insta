package com.instabot.backend.dto.flow;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowNode {
    private String id;
    private String type;
    private JsonNode data;
}
