from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import akshare as ak
import pandas as pd

# ====================== FastAPI 应用（带完整文档配置） ======================
app = FastAPI(
    title="股票数据接口服务（AKShare 版）",
    description="""
### 免费股票数据接口（无 Token、无积分、无限制）
- 数据源：东方财富网 / 同花顺 / 新浪
- 支持：日线 / 周线 / 月线 / 1/5/15/30/60 分钟 K线 / 实时行情 / 指数数据
- 全部接口返回统一格式：`{"code":200,"data":[],"msg":""}`
""",
    version="3.0",
    docs_url="/docs",  # 文档地址
    redoc_url="/redoc" # 另一种文档风格
)

# ====================== 统一返回格式 ======================
def resp_success(data=None):
    return JSONResponse({"code": 200, "msg": "success", "data": jsonable_encoder(data or [])})

def resp_error(msg: str):
    return JSONResponse({"code": 500, "msg": msg, "data": []})

# ====================== 接口 ======================

@app.get("/", summary="健康检查", tags=["系统"])
def home():
    """
    ### 服务状态检测
    用于判断服务是否正常运行
    """
    return resp_success({"status": "running", "time": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")})

# -------------------- 股票列表 --------------------
@app.get("/api/stock/list", summary="获取 A 股股票列表", tags=["股票基础数据"])
def get_stock_list():
    """
    ### 获取全部 A 股股票代码与名称
    - 无参数
    - 返回：代码、股票名称
    """
    try:
        df = ak.stock_info_a_code_name()
        df.columns = ["symbol", "name"]
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 日线行情 --------------------
@app.get("/api/quote/daily", summary="日线 K 线", tags=["K 线数据"])
def get_daily(
    ts_code: str = Query(..., description="股票代码，格式：600000.SH / 000001.SZ", example="600000.SH"),
    start_date: str = Query(..., description="开始日期，格式：YYYYMMDD", example="20250101"),
    end_date: str = Query(..., description="结束日期，格式：YYYYMMDD", example="20250520")
):
    """
    ### 获取 A 股日线行情（前复权）
    - 字段：日期、开盘、最高、最低、收盘、成交量、成交额等
    - 自动处理市场后缀（.SH / .SZ）
    """
    try:
        code = ts_code.split(".")[0]
        df = ak.stock_zh_a_hist(
            symbol=code,
            period="daily",
            start_date=start_date,
            end_date=end_date,
            adjust="qfq"
        )
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 周线 --------------------
@app.get("/api/quote/weekly", summary="周线 K 线", tags=["K 线数据"])
def get_weekly(
    ts_code: str = Query(..., example="600000.SH"),
    start_date: str = Query(..., example="20250101"),
    end_date: str = Query(..., example="20250520")
):
    """### A 股周线 K 线（前复权）"""
    try:
        code = ts_code.split(".")[0]
        df = ak.stock_zh_a_hist(symbol=code, period="weekly", start_date=start_date, end_date=end_date, adjust="qfq")
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 月线 --------------------
@app.get("/api/quote/monthly", summary="月线 K 线", tags=["K 线数据"])
def get_monthly(
    ts_code: str = Query(..., example="600000.SH"),
    start_date: str = Query(..., example="20250101"),
    end_date: str = Query(..., example="20250520")
):
    """### A 股月线 K 线（前复权）"""
    try:
        code = ts_code.split(".")[0]
        df = ak.stock_zh_a_hist(symbol=code, period="monthly", start_date=start_date, end_date=end_date, adjust="qfq")
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 分钟 K 线 --------------------
@app.get("/api/quote/minute", summary="分钟级 K 线（1/5/15/30/60）", tags=["K 线数据"])
def get_minute(
    ts_code: str = Query(..., description="股票代码，如 600000.SH", example="600000.SH"),
    freq: str = Query("5", description="分钟级别：1、5、15、30、60", example="5"),
):
    """
    ### 获取 A 股分钟级 K 线
    - 支持：1/5/15/30/60 分钟
    - 数据源：东方财富
    - 无需传入开始/结束时间，自动返回最近数据
    """
    try:
        code = ts_code.split(".")[0]
        df = ak.stock_zh_a_hist_min_em(symbol=code, period=int(freq))
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 实时行情 --------------------
@app.get("/api/quote/realtime", summary="实时行情", tags=["实时数据"])
def get_realtime(
    code: str = Query(..., description="股票代码：6 位数字", example="600000")
):
    """
    ### 获取股票实时行情
    - 包含：最新价、开盘、最高、最低、成交量、涨跌额、涨跌幅、换手率等
    """
    try:
        df = ak.stock_zh_a_spot_em(symbol=code)
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# -------------------- 指数日线 --------------------
@app.get("/api/index/daily", summary="指数日线", tags=["指数数据"])
def get_index_daily(
    ts_code: str = Query(..., description="指数代码，如 000001.SH", example="000001.SH"),
    start_date: str = Query(..., example="20250101"),
    end_date: str = Query(..., example="20250520")
):
    """
    ### 获取指数日线数据
    - 例：上证指数 000001.SH、深成指 399001.SZ
    """
    try:
        code = ts_code.split(".")[0]
        df = ak.stock_zh_index_hist_csindex(symbol=code, start_date=start_date, end_date=end_date)
        return resp_success(df.to_dict("records"))
    except Exception as e:
        return resp_error(str(e))

# ====================== 启动服务 ======================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
