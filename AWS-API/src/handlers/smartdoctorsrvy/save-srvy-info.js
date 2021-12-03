const sql = require('mssql');
const util = require('../util');
const dbCommon = require('../dbHandler/db-handler')

exports.saveSrvyInfo = async(event) =>{
    const OrgId = event["CareOrgId"];
    const orgCustId = event["OrgCustId"];
    const SrvyTitle = event["SrvyTitle"];
    const SrvyFormId  = event["SrvyFormId"];
    const SrvyScriptId  = event["SrvyScriptId"];
    const SrvyNo   = event["SrvyNo"];
    const SrvyLogin  = event["SrvyLogin"];
    const SrvyStat = event["SrvyStat"];
    const SrvyInit = event["SrvyInit"];
    
    let orgName = null;
    const dbConnectionInfo = await util.getOrgInfoByOrgCustIdAndName(OrgId,orgCustId,orgName);
    if(!dbConnectionInfo["Success"]) return dbConnectionInfo["result"];

    let isInitExist = await isFirstSubmit(dbConnectionInfo["result"],SrvyTitle,SrvyNo);
    
    if(isInitExist.length <1)
      {
       queryResult = await InitSrvyInfo(dbConnectionInfo["result"],SrvyTitle,SrvyInit,SrvyStat,SrvyScriptId,SrvyFormId,SrvyLogin,SrvyNo );
      }
    else 
      {
       queryResult = await updateSrvyInfo(dbConnectionInfo["result"],SrvyTitle,SrvyInit,SrvyStat,SrvyScriptId,SrvyFormId,SrvyLogin,SrvyNo );
      }
    
  
    if(queryResult?.["rowsAffected"]?.[0] > 0){
        const result = queryResult;
        return {
            StatusCode : 200,
            Success : "작업을 완료하였습니다."               
        }
    }
    else if(queryResult.hasOwnProperty("originalError")){
        return {
            StatusCode : 400,
            rejection : "서버에 연결하지 못하였습니다."
        }
    }
    else { 
        return {
            StatusCode : 404,
            rejection  : "저장에 실패했습니다."
        }
    }
  
    async function isFirstSubmit(row,SrvyTitle,SrvyNo)
    {
        const custConf = {
            database : "Almighty",
            server : row["ServerIp"],
            port : row["ServerPort"],
            custNo : row["CustNo"],
            query : `
            SELECT *
            FROM SURVEY_INFO_LIST
            WHERE CARE_ORG_ID = @CareOrgId
            AND SRVY_TITLE = @SrvyTitle
            AND SRVY_NO = @SrvyNo;
                  `,
            args : [
                {
                    key : "CareOrgId",
                    type : sql.Char,
                    value : row["CareOrgId"]
                },
                {
                    key: "SrvyTitle",
                    type : sql.NVarChar(8000),
                    value : SrvyTitle
                },
                {
                    key: "SrvyNo",
                    type : sql.NVarChar(8000),
                    value : SrvyNo
                }
            ]
        }
        const queryResult = await dbCommon.executeSingleQuery(custConf);
        if(queryResult?.["rowsAffected"]?.[0] >= 0)
             return queryResult["recordset"]
        else return queryResult;
    }

    async function InitSrvyInfo(row,SrvyTitle,SrvyInit,SrvyStat,SrvyScriptId,SrvyFormId,SrvyLogin,SrvyNo )
    {
        const custConf  = {
        database : "Almighty",
        server : row["ServerIp"],
        port : row["ServerPort"],
        custNo : row["CustNo"],
        query : `
        INSERT INTO SURVEY_INFO_LIST(
        CARE_ORG_ID, 
        SRVY_INIT, 
        SRVY_TITLE, 
        SRVY_STAT, 
        SRVY_SCRIPT_ID,
        SRVY_FORM_ID, 
        SRVY_LOGIN, 
        SRVY_NO,
        ENTR_DAY,
        ENTR_TIME,
        MDFY_DAY,
        MDFY_TIME
        )
        VALUES(
        @CareOrgId, 
        @SrvyInit, 
        @SrvyTitle, 
        @SrvyStat, 
        @SrvyScriptId, 
        @SrvyFormId, 
        @SrvyLogin, 
        @SrvyNo,
        CONVERT(CHAR(8), Getdate(), 112),
        LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4),
        CONVERT(CHAR(8), Getdate(), 112),
        LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4))
              `,
        args : [
            {
                key : "CareOrgId",
                type : sql.Char,
                value : row["CareOrgId"]
            },
            {
                key : "SrvyTitle",
                type : sql.NVarChar(8000),
                value : SrvyTitle
            },
            {
                key : "SrvyInit",
                type : sql.NVarChar(8000),
                value : SrvyInit
            },
            {
                key : "SrvyStat",
                type : sql.NVarChar(8000),
                value : SrvyStat
            },
            {
                key : "SrvyScriptId",
                type : sql.NVarChar(8000),
                value : SrvyScriptId
            },
            {
                key : "SrvyFormId",
                type : sql.NVarChar(8000),
                value : SrvyFormId
            },
            {
                key : "SrvyLogin",
                type : sql.NVarChar(8000),
                value : SrvyLogin
            },
            {
                key : "SrvyNo",
                type : sql.NVarChar(8000),
                value : SrvyNo 
            }]
         }
         return await dbCommon.executeSingleQuery(custConf);
    }
    async function updateSrvyInfo(row,SrvyTitle,SrvyInit,SrvyStat,SrvyScriptId,SrvyFormId,SrvyLogin,SrvyNo)
    {
    const custConf = {
        database : "Almighty",
        server : row["ServerIp"],
        port : row["ServerPort"],
        custNo : row["CustNo"],
        query : `
        IF EXISTS(SELECT * FROM SURVEY_INFO_LIST where CARE_ORG_ID = @CareOrgId AND SRVY_TITLE= @SrvyTitle AND SRVY_INIT is NULL)
        BEGIN
            UPDATE SURVEY_INFO_LIST SET
            SRVY_INIT = @SrvyInit,
            SRVY_STAT = @SrvyStat,
            SRVY_SCRIPT_ID = @SrvyScriptId,
            SRVY_FORM_ID = @SrvyFormId,
            SRVY_LOGIN = @SrvyLogin,
            MDFY_DAY =CONVERT(CHAR(8), Getdate(), 112),
            MDFY_TIME = LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4)
            WHERE CARE_ORG_ID = @CareOrgId
            AND SRVY_TITLE= @SrvyTitle
            AND SRVY_NO = @SrvyNo
        END
        ELSE
        BEGIN
            UPDATE SURVEY_INFO_LIST SET
            SRVY_SCRIPT_ID = @SrvyScriptId,
            SRVY_FORM_ID = @SrvyFormId,
            SRVY_LOGIN = @SrvyLogin,
            MDFY_DAY =CONVERT(CHAR(8), Getdate(), 112),
            MDFY_TIME = LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4)
            WHERE CARE_ORG_ID = @CareOrgId
            AND SRVY_TITLE= @SrvyTitle
            AND SRVY_NO = @SrvyNo;
        END
           `,
           args : [
            {
                key : "CareOrgId",
                type : sql.Char,
                value : row["CareOrgId"]
            },
            {
                key : "SrvyTitle",
                type : sql.NVarChar(8000),
                value : SrvyTitle
            },
            {
                key : "SrvyInit",
                type : sql.NVarChar(8000),
                value : SrvyInit
            },
            {
                key : "SrvyStat",
                type : sql.NVarChar(8000),
                value : SrvyStat
            },
            {
                key : "SrvyScriptId",
                type : sql.NVarChar(8000),
                value : SrvyScriptId
            },
            {
                key : "SrvyFormId",
                type : sql.NVarChar(8000),
                value : SrvyFormId
            },
            {
                key : "SrvyLogin",
                type : sql.NVarChar(8000),
                value : SrvyLogin
            },
            {
                key : "SrvyNo",
                type : sql.NVarChar(8000),
                value : SrvyNo 
            }
            ]
    }
    return await dbCommon.executeSingleQuery(custConf);    
    }

}