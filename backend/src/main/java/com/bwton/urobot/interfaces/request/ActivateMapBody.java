package com.bwton.urobot.interfaces.request;

import com.fasterxml.jackson.annotation.JsonAlias;

public class ActivateMapBody {
    @JsonAlias("editionId")
    private String editionId;

    public String getEditionId() {
        return editionId;
    }

    public void setEditionId(String editionId) {
        this.editionId = editionId;
    }
}
