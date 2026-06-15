package com.bwton.urobot.infrastructure.lang;


import java.io.Serializable;

public class PageQuery implements Serializable {

    private Integer pageNo;
    private Integer pageSize;
    private Boolean countTotal;

    public PageQuery() {
        this.pageNo = 1;
        this.pageSize = 20;
        this.countTotal = true;
    }

    public PageQuery(Integer pageNo, Integer pageSize) {
        this.pageNo = 1;
        this.pageSize = 20;
        this.countTotal = true;
        this.pageNo = pageNo;
        this.pageSize = pageSize;
    }

    public PageQuery(Integer pageNo, Integer pageSize, Boolean countTotal) {
        this(pageNo, pageSize);
        this.countTotal = countTotal;
    }

    public void defaultPageParam() {
        this.defaultPageParam((Integer)null, (Integer)null);
    }

    public void defaultPageParam(Integer defaultPageNo, Integer defaultPageSize) {
        this.defaultPageParam(defaultPageNo, defaultPageSize, (Boolean)null);
    }

    public void defaultPageParam(Integer defaultPageNo, Integer defaultPageSize, Boolean defaultCountTotal) {
        if (this.pageNo == null || this.pageNo <= 0) {
            this.pageNo = defaultPageNo != null && defaultPageNo > 0 ? defaultPageNo : 1;
        }

        if (this.pageSize == null || this.pageSize <= 0) {
            this.pageSize = defaultPageSize != null && defaultPageSize > 0 ? defaultPageSize : 10;
        }

        if (this.countTotal == null) {
            this.countTotal = defaultCountTotal == null || defaultCountTotal;
        }

    }

    public void one() {
        this.pageNo = 1;
        this.pageSize = 1;
        this.countTotal = false;
    }

    public long offset() {
        long current = (long)this.pageNo;
        return current <= 1L ? 0L : Math.max((current - 1L) * (long)this.pageSize, 0L);
    }

    public Integer getPageNo() {
        return this.pageNo;
    }

    public Integer getPageSize() {
        return this.pageSize;
    }

    public Boolean getCountTotal() {
        return this.countTotal;
    }

    public void setPageNo(Integer pageNo) {
        this.pageNo = pageNo;
    }

    public void setPageSize(Integer pageSize) {
        this.pageSize = pageSize;
    }

    public void setCountTotal(Boolean countTotal) {
        this.countTotal = countTotal;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof PageQuery)) {
            return false;
        } else {
            PageQuery other = (PageQuery)o;
            if (!other.canEqual(this)) {
                return false;
            } else {
                Object this$pageNo = this.getPageNo();
                Object other$pageNo = other.getPageNo();
                if (this$pageNo == null) {
                    if (other$pageNo != null) {
                        return false;
                    }
                } else if (!this$pageNo.equals(other$pageNo)) {
                    return false;
                }

                Object this$pageSize = this.getPageSize();
                Object other$pageSize = other.getPageSize();
                if (this$pageSize == null) {
                    if (other$pageSize != null) {
                        return false;
                    }
                } else if (!this$pageSize.equals(other$pageSize)) {
                    return false;
                }

                Object this$countTotal = this.getCountTotal();
                Object other$countTotal = other.getCountTotal();
                if (this$countTotal == null) {
                    return other$countTotal == null;
                } else return this$countTotal.equals(other$countTotal);
            }
        }
    }

    protected boolean canEqual(Object other) {
        return other instanceof PageQuery;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $pageNo = this.getPageNo();
        result = result * 59 + ($pageNo == null ? 43 : $pageNo.hashCode());
        Object $pageSize = this.getPageSize();
        result = result * 59 + ($pageSize == null ? 43 : $pageSize.hashCode());
        Object $countTotal = this.getCountTotal();
        result = result * 59 + ($countTotal == null ? 43 : $countTotal.hashCode());
        return result;
    }

    public String toString() {
        Integer var10000 = this.getPageNo();
        return "PageQuery(pageNo=" + var10000 + ", pageSize=" + this.getPageSize() + ", countTotal=" + this.getCountTotal() + ")";
    }
}
