package com.email.writer.app;

import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;


@Service
public class EmailGeneratorService {

    private final WebClient webClient;

    @Value("${gemini.api.url}")
    private String geminiApiUrl;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    public EmailGeneratorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    public String generateEmailReply(EmailRequest emailRequest){
      //build the prompt
      String prompt = buildPrompt(emailRequest);

      //craft a request
      Map<String, Object> requestBody = Map.of(
        "contents", new Object[] {
          Map.of("parts", new Object[]{
            Map.of("text", prompt)
          })
        }
      );

        String cleanUrl = geminiApiUrl.trim() + geminiApiKey.trim();

      // do request and get response
      String response = webClient.post()
              .uri(cleanUrl)
              .header("Content-Type","application/json")
              .bodyValue(requestBody)
              .retrieve()
              .bodyToMono(String.class)
              .block();

      // return response
      return extractResponseContent(response);
    }

    private String buildPrompt(EmailRequest emailRequest) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an advanced AI assistant that writes well-structured, context-aware email replies. ")
                .append("Below is the original email content you need to respond to, followed by the desired tone of the reply. ")
                .append("Your response should be clear, concise, and aligned with professional email etiquette. ")
                .append("Please do not generate a subject line.\n\n");

        if (emailRequest.getTone() != null && !emailRequest.getTone().isEmpty()) {
            prompt.append("Tone: ").append(emailRequest.getTone()).append("\n");
        }

        prompt.append("Instructions:\n")
                .append("- Maintain the context of the original email.\n")
                .append("- Ensure the response is polite and professional.\n")
                .append("- If the email requires an action, acknowledge it and provide an appropriate response.\n")
                .append("- Avoid unnecessary details but ensure completeness.\n")
                .append("- Keep formatting clean, using paragraphs where necessary.\n")
                .append("- Always end the email with appropriate regards.\n\n")
                .append("Original Email Content:\n")
                .append(emailRequest.getEmailContent());

        return prompt.toString();
    }



    private String extractResponseContent(String response) {
        try{
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.readTree(response);

            return rootNode.path("candidates")
                    .get(0)
                    .path("content")
                    .path("parts")
                    .get(0)
                    .path("text").asText();

        }catch (Exception e){
            return "Error processing request" + e.getMessage();
        }
    }

}


