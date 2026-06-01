package com.bwton.urobot.infrastructure.lang;


import java.io.Serializable;

public class Result<T> implements Serializable {
    private boolean success;
    private String errcode;
    private String errmsg;
    private T result;

    public Result() {
    }

    public Result(String errcode, String errmsg, T result) {

        this.errcode = errcode;
        this.errmsg = errmsg;
        if (null != result) {
            this.result = result;
        }

    }

    public Result(boolean success, String errcode, String errmsg) {
        this.success = success;
        this.errcode = errcode;
        this.errmsg = errmsg;
    }

    public Result(boolean success, String errcode, String errmsg, T result) {
        this.success = success;
        this.errcode = errcode;
        this.errmsg = errmsg;
        this.result = result;
    }

    public boolean isSuccess() {
        return this.success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getErrcode() {
        return this.errcode;
    }

    public void setErrcode(String errcode) {
        this.errcode = errcode;
    }

    public String getErrmsg() {
        return this.errmsg;
    }

    public void setErrmsg(String errmsg) {
        this.errmsg = errmsg;
    }

    public T getResult() {
        return this.result;
    }

    public void setResult(T result) {
        this.result = result;
    }

    public String toString() {
        String var10000 = this.errcode;
        return "Result{errcode='" + var10000 + "', errmsg='" + this.errmsg + "', result=" + String.valueOf(this.result) + "}";
    }
}