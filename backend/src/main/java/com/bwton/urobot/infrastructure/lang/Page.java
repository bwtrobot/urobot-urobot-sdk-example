package com.bwton.urobot.infrastructure.lang;


import java.io.Serializable;
import java.util.List;

public class Page<T> implements Serializable {
    private int totalCount;
    private int pageNo;
    private int pageSize;
    private int totalPage;
    private List<T> rows;

    public Page() {
    }

    public T getRow(int i) {
        return (T)(this.rows != null ? this.rows.get(i) : null);
    }

    public T getFirstRow() {
        return (T)(this.isEmpty() ? null : this.getRow(0));
    }

    public T getLastRow() {
        return (T)(this.isEmpty() ? null : this.getRow(this.rows.size() - 1));
    }

    public boolean isEmpty() {
        return this.rows == null || this.rows.isEmpty();
    }

    public int getTotalCount() {
        return this.totalCount;
    }

    public int getPageNo() {
        return this.pageNo;
    }

    public int getPageSize() {
        return this.pageSize;
    }

    public int getTotalPage() {
        return this.totalPage;
    }

    public List<T> getRows() {
        return this.rows;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public void setPageNo(int pageNo) {
        this.pageNo = pageNo;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public void setTotalPage(int totalPage) {
        this.totalPage = totalPage;
    }

    public void setRows(List<T> rows) {
        this.rows = rows;
    }

    public boolean equals(Object o) {
        if (o == this) {
            return true;
        } else if (!(o instanceof Page)) {
            return false;
        } else {
            Page<?> other = (Page<?>)o;
            if (!other.canEqual(this)) {
                return false;
            } else if (this.getTotalCount() != other.getTotalCount()) {
                return false;
            } else if (this.getPageNo() != other.getPageNo()) {
                return false;
            } else if (this.getPageSize() != other.getPageSize()) {
                return false;
            } else if (this.getTotalPage() != other.getTotalPage()) {
                return false;
            } else {
                Object this$rows = this.getRows();
                Object other$rows = other.getRows();
                if (this$rows == null) {
                    return other$rows == null;
                } else return this$rows.equals(other$rows);
            }
        }
    }

    protected boolean canEqual(Object other) {
        return other instanceof Page;
    }

    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        result = result * 59 + this.getTotalCount();
        result = result * 59 + this.getPageNo();
        result = result * 59 + this.getPageSize();
        result = result * 59 + this.getTotalPage();
        Object $rows = this.getRows();
        result = result * 59 + ($rows == null ? 43 : $rows.hashCode());
        return result;
    }

    public String toString() {
        int var10000 = this.getTotalCount();
        return "Page(totalCount=" + var10000 + ", pageNo=" + this.getPageNo() + ", pageSize=" + this.getPageSize() + ", totalPage=" + this.getTotalPage() + ", rows=" + String.valueOf(this.getRows()) + ")";
    }
}
