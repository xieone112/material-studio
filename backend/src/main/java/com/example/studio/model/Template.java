package com.example.studio.model;

import java.util.Arrays;
import java.util.List;

public class Template {

    private String id;
    private String title;
    private String description;
    private String channel;
    private String category;
    private String coverUrl;
    private String resultUrl;
    private int requiredImageCount;
    private String acceptedMimeTypes;
    private long maxFileSizeBytes;
    private int sortOrder;
    private boolean enabled;

    public List<String> acceptedMimeList() {
        return Arrays.asList(acceptedMimeTypes.split(","));
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getResultUrl() { return resultUrl; }
    public void setResultUrl(String resultUrl) { this.resultUrl = resultUrl; }
    public int getRequiredImageCount() { return requiredImageCount; }
    public void setRequiredImageCount(int requiredImageCount) { this.requiredImageCount = requiredImageCount; }
    public String getAcceptedMimeTypes() { return acceptedMimeTypes; }
    public void setAcceptedMimeTypes(String acceptedMimeTypes) { this.acceptedMimeTypes = acceptedMimeTypes; }
    public long getMaxFileSizeBytes() { return maxFileSizeBytes; }
    public void setMaxFileSizeBytes(long maxFileSizeBytes) { this.maxFileSizeBytes = maxFileSizeBytes; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}
