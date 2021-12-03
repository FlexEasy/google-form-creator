const sql = require('mssql');
const util = require('../util');
const dbCommon = require('../dbHandler/db-handler')

exports.getSrvyId = async(event) =>{
    const OrgId = event["CareOrgId"];
    const orgCustId = event["OrgCustId"];
    const SrvyTitle = event["SrvyTitle"];
    const SrvyNo   = event["SrvyNo"];
    let orgName = null;
    const dbConnectionInfo = await util.getOrgInfoByOrgCustIdAndName(OrgId,orgCustId,orgName);
    if(!dbConnectionInfo["Success"]) return dbConnectionInfo["result"];

    queryResult= await getSrvyId(dbConnectionInfo["result"],SrvyTitle,SrvyNo)
    let srvyInfo = queryResult;
    
    if(srvyInfo .length >= 1 ){//(queryResult?.["rowsAffected"]?.[0] > 0){
        return {
            StatusCode : 200,
            Survey_ScriptID : srvyInfo[0].SRVY_SCRIPT_ID,
            Survey_FormID : srvyInfo[0].SRVY_FORM_ID,
            Survey_LoginInfo : srvyInfo[0].SRVY_LOGIN 
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
            rejection  : "설문 ID를 읽어올 수 없습니다."
        }
    }
  
    async function getSrvyId(row,SrvyTitle,SrvyNo)
    {
        const custConf = {
            database : "Almighty",
            server : row["ServerIp"],
            port : row["ServerPort"],
            custNo : row["CustNo"],
            query : `
            SELECT SRVY_SCRIPT_ID, SRVY_FORM_ID,SRVY_LOGIN 
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
                },
            ]
        }
        const queryResult = await dbCommon.executeSingleQuery(custConf);
        if(queryResult?.["rowsAffected"]?.[0] >= 0)
            return queryResult["recordset"]
        else return queryResult;
    }
}