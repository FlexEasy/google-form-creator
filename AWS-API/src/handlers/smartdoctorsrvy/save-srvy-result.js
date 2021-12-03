const sql = require('mssql');
const util = require('../util');
const dbCommon = require('../dbHandler/db-handler')

exports.saveSrvyRslt = async (event) => {
    const OrgId = event["CareOrgId"];
    const orgCustId = event["OrgCustId"];
    const CustPhoneNo = event["CustPhone"];
    const CustName = event["CustName"];
    const SrvyUrl = event["SrvyUrl"];
    const SrvyNo = event["SrvyNo"];
    const SrvyTitle = event["SrvyTitle"];
    const SrvyDate = event["SrvyDate"];
    const SrvyRslt = event["SrvyRslt"];
 
    let orgName = null;
    const dbConnectionInfo = await util.getOrgInfoByOrgCustIdAndName(OrgId,orgCustId, orgName);
    if (!dbConnectionInfo["Success"]) return dbConnectionInfo["result"];
    const custNo = await getCustNoByNameandCellNo(dbConnectionInfo["result"], CustPhoneNo, CustName);
    let isExist = await isResultExist(dbConnectionInfo["result"], custNo, SrvyUrl, SrvyTitle, SrvyDate);
    if (isExist.length < 1) {
        queryResult = await saveSrvyResult(dbConnectionInfo["result"], custNo, CustPhoneNo, CustName, SrvyUrl, SrvyTitle, SrvyDate);
    }
    else {
        queryResult = await updateSrvyResult(dbConnectionInfo["result"], custNo, CustPhoneNo, CustName, SrvyUrl, SrvyTitle, SrvyDate);
    }

    var saveSrvyAnswerResults = []
    var rslt = SrvyRslt
    var result = {}

    if (isAnswerSaved(dbConnectionInfo["result"], custNo, SrvyDate, SrvyNo)) {
        var deleteResult = await deleteSavedAnswer(dbConnectionInfo["result"], custNo, SrvyDate, SrvyNo)
        saveSrvyAnswerResults.push(deleteResult.status + " : " + deleteResult.message)
    }
    
    for (var i = 0; i < Object.keys(rslt).length; i++) {
        var saveSrvyAnswerResult = await saveSrvyAnswers(dbConnectionInfo["result"], custNo, SrvyDate, SrvyNo, Object.keys(rslt)[i], rslt[Object.keys(rslt)[i]]);
        for (var j = 0; j < Object.keys(saveSrvyAnswerResult).length; j++) {
            if (saveSrvyAnswerResult[j].status == "Error") {
                saveSrvyAnswerResults.push(saveSrvyAnswerResult[j].status + " : " + saveSrvyAnswerResult[j].message)
            }
        }
    }


    if (queryResult?.["rowsAffected"]?.[0] > 0) {
        result = {
            StatusCode: 200,
            Success: "작업을 완료하였습니다."
        }
    }
    else if (queryResult.hasOwnProperty("originalError")) {
        result = {
            StatusCode: 400,
            rejection: "서버에 연결하지 못하였습니다."
        }
    }
    else {
        result = {
            StatusCode: 404,
            rejection: "저장에 실패했습니다."
        }
    }
    
    result["saveSrvyAnswerResults"] = saveSrvyAnswerResults

    return result

    async function saveSrvyAnswers(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemSeqno, TextDesc) {
        var CtznNo = await getCtznNoByCustNo(row, CustNo)
        var QstnItemCd = await getItemCdByItemSeqno(row, QstnMdclCd, QstnItemSeqno)
        var ItemType = await getItemTypeByItemSeqno(row, QstnMdclCd, QstnItemSeqno)

        var QstnAnsrCd
        var QstnAnsrEsay = ""
        var CustMdclSubj = ""
        var QstnAnsrImg
        var result = []

        if (ItemType == "01" || ItemType == "02") {
            if (typeof TextDesc == "string") {
                QstnAnsrCd = await getAnsrCdByTextCd(row, QstnMdclCd, QstnItemCd, TextDesc);
                result.push(await saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg))
            }
            else {
                for (let i = 0; i < Object.keys(TextDesc).length; i++) {
                    QstnAnsrCd = await getAnsrCdByTextCd(row, QstnMdclCd, QstnItemCd, TextDesc[Object.keys(TextDesc)[i]])
                    if (QstnAnsrCd == undefined) 
                    {
                        var TextCdwithEtc = await SelectTextCdIncludingEtc(row, QstnMdclCd, QstnItemCd);
                        if(TextCdwithEtc != undefined)
                        {
                          QstnAnsrCd =  TextCdwithEtc["TextCd"].split(/[!_]+/).pop();
                        } 
                        QstnAnsrEsay = TextDesc[Object.keys(TextDesc)[i]]
                        result.push(await saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg))
                    }
                    else {
                        result.push(await saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg))
                    }
                }
            }
        }
        else if (ItemType == "03") {

        }
        else if (ItemType == "04") {
            QstnAnsrCd = await getEssayAnsrCd(row, QstnMdclCd, QstnItemCd);
            QstnAnsrEsay = TextDesc;
            result.push(await saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg))
        }
        else if (ItemType == "05") {
            QstnAnsrCd = TextDesc;
            QstnAnsrImg = await GetByteByTextCd(row, QstnMdclCd, QstnItemCd, QstnAnsrCd)
            result.push(await saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg))
        }

        return result
    }


    async function saveSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg) {

        var QstnAnsrSeqno = await getAnsrSeqnoByAnsrCd(row, QstnMdclCd, QstnItemCd, QstnAnsrCd)
        var result = await insertSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg, QstnAnsrSeqno);
        
        return result
    }

    async function isAnswerSaved(row, CustNo, QstnMdclDay, QstnMdclCd) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT *
            FROM QSTN_MDCL_CNTN
            WHERE CARE_ORG_ID = @CareOrgId
            AND CUST_NO = @CustNo
            AND QSTN_MDCL_DAY = Replace(ISNULL(@QstnMdclDay, CONVERT(CHAR(8), Getdate(), 112)),'-','')
            AND QSTN_MDCL_CD = @QstnMdclCd
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "QstnMdclDay",
                    type: sql.Char,
                    value: QstnMdclDay
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                }
            ]
        }
        const queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] >= 0)
            return queryResult["recordset"].length > 0
        else return false
    }

    async function deleteSavedAnswer(row, CustNo, QstnMdclDay, QstnMdclCd) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            DELETE
            FROM QSTN_MDCL_CNTN
            WHERE CARE_ORG_ID = @CareOrgId
            AND CUST_NO = @CustNo
            AND QSTN_MDCL_DAY = Replace(ISNULL(@QstnMdclDay, CONVERT(CHAR(8), Getdate(), 112)),'-','')
            AND QSTN_MDCL_CD = @QstnMdclCd
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "QstnMdclDay",
                    type: sql.Char,
                    value: QstnMdclDay
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                }
            ]
        }

        return await getResultMessage(custConf, "DELETE")
    }


    async function updateSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg, QstnAnsrSeqno) {

        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            UPDATE QSTN_MDCL_CNTN
            SET
            CUST_NAME = @CustName,
            QSTN_ANSR_ESAY = @QstnAnsrEsay,
            QSTN_ANSR_SEQNO = @QstnAnsrSeqno,
            MDFY_USER_ID = 'MQgine',
            ENTR_DAY = CONVERT(CHAR(8), Getdate(), 112),
            ENTR_TIME = LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4),
            CTZN_NO = @CtznNo,
            CUST_MDCL_SUBJ = @CustMdclSubj,
            QSTN_ANSR_IMG = @QstnAnsrImg
            WHERE 
            CARE_ORG_ID = @CareOrgId
            AND CUST_NO = @CustNo
            AND  QSTN_MDCL_DAY = Replace(ISNULL(@QstnMdclDay, CONVERT(CHAR(8), Getdate(), 112)),'-','')
            AND QSTN_MDCL_CD = @QstnMdclCd
            AND QSTN_ITEM_CD = @QstnItemCd
            AND  QSTN_ANSR_CD = @QstnAnsrCd
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "QstnMdclDay",
                    type: sql.Char,
                    value: QstnMdclDay
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                },
                {
                    key: "QstnItemCd",
                    type: sql.Int,
                    value: QstnItemCd
                },
                {
                    key: "QstnAnsrCd",
                    type: sql.NVarChar(8000),
                    value: QstnAnsrCd
                },
                {
                    key: "CustName",
                    type: sql.NVarChar(8000),
                    value: CustName
                },
                {
                    key: "QstnAnsrEsay",
                    type: sql.NVarChar(8000),
                    value: QstnAnsrEsay
                },
                {
                    key: "QstnAnsrSeqno",
                    type: sql.Int,
                    value: QstnAnsrSeqno
                },
                {
                    key: "CtznNo",
                    type: sql.NVarChar(8000),
                    value: CtznNo
                },
                {
                    key: "CustMdclSubj",
                    type: sql.NVarChar(8000),
                    value: CustMdclSubj
                },
                {
                    key: "QstnAnsrImg",
                    type: sql.Image,
                    value: QstnAnsrImg
                }

            ]
        }
        return await getResultMessage(custConf, "UPDATE")
    }
    async function insertSrvyAnswer(row, CustNo, QstnMdclDay, QstnMdclCd, QstnItemCd, QstnAnsrCd, QstnAnsrEsay, CtznNo, CustMdclSubj, QstnAnsrImg, QstnAnsrSeqno) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            INSERT INTO QSTN_MDCL_CNTN
            (CARE_ORG_ID
            ,CUST_NO
            ,QSTN_MDCL_DAY
            ,QSTN_MDCL_CD
            ,QSTN_ITEM_CD
            ,QSTN_ANSR_CD
            ,CUST_NAME
            ,QSTN_ANSR_ESAY
            ,QSTN_ANSR_SEQNO
            ,ENTR_USER_ID
            ,ENTR_DAY
            ,ENTR_TIME
            ,MDFY_USER_ID
            ,MDFY_DAY
            ,MDFY_TIME
            ,CTZN_NO
            ,CUST_MDCL_SUBJ
            ,QSTN_ANSR_IMG)
            VALUES      (
              @CareOrgId,
              @CustNo,
              Replace(ISNULL(@QstnMdclDay, CONVERT(CHAR(8), Getdate(), 112)),'-',''),
              @QstnMdclCd,
              @QstnItemCd,
              @QstnAnsrCd,
              @CustName,
              @QstnAnsrEsay,
              @QstnAnsrSeqno,
              'MQgine',
              CONVERT(CHAR(8), Getdate(), 112),
              LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4),
              'MQgine',
              CONVERT(CHAR(8), Getdate(), 112),
              LEFT(Replace(CONVERT(CHAR, Getdate(), 108), ':', ''), 4),
              @CtznNo,
              @CustMdclSubj,
              @QstnAnsrImg)
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "QstnMdclDay",
                    type: sql.Char,
                    value: QstnMdclDay
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                },
                {
                    key: "QstnItemCd",
                    type: sql.Int,
                    value: QstnItemCd
                },
                {
                    key: "QstnAnsrCd",
                    type: sql.NVarChar(8000),
                    value: QstnAnsrCd
                },
                {
                    key: "CustName",
                    type: sql.NVarChar(8000),
                    value: CustName
                },
                {
                    key: "QstnAnsrEsay",
                    type: sql.NVarChar(8000),
                    value: QstnAnsrEsay
                },
                {
                    key: "QstnAnsrSeqno",
                    type: sql.Int,
                    value: QstnAnsrSeqno
                },
                {
                    key: "CtznNo",
                    type: sql.NVarChar(8000),
                    value: CtznNo
                },
                {
                    key: "CustMdclSubj",
                    type: sql.NVarChar(8000),
                    value: CustMdclSubj
                },
                {
                    key: "QstnAnsrImg",
                    type: sql.Image,
                    value: QstnAnsrImg
                }

            ]
        }
        return await getResultMessage(custConf, "INSERT")
    }

    async function getResultMessage(custConf, option) {
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        var result
        
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            result = {
                message: custConf.args.map(a => a.key + " = " + a.value + " ").slice(0, 9).toString(),
                status: option + "Row Affected"
            }
        else
            result = {
                message: queryResult.message + " " + custConf.args.map(a => a.key + " = " + a.value + " ").slice(0, 9).toString(),
                status: option + "Error"
            }

        return result
    }

    async function getCtznNoByCustNo(row, CustNo) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT CTZN_NO CtznNo FROM CUST_INFO 
            WHERE CUST_NO = @CustNo
            `,
            args: [
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["CtznNo"]
    }


    async function getAnsrCdByTextCd(row, QstnMdclCd, QstnItemCd, TextDesc) {
        var TextCd = QstnMdclCd + '!_' + QstnItemCd + '!_%'
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT TEXT_CD TextCd FROM QSTN_MDCL_TEXT_INFO 
            WHERE TEXT_CD like @TextCd 
            AND TEXT_DESC = @TextDesc
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "TextCd",
                    type: sql.NVarChar(8000),
                    value: TextCd
                },
                {
                    key: "TextDesc",
                    type: sql.NVarChar(8000),
                    value: TextDesc
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["TextCd"].split(/[!_]+/).pop()
    }

    async function getEssayAnsrCd(row, QstnMdclCd, QstnItemCd) {
        var TextCd = QstnMdclCd + '!_' + QstnItemCd + '!_%'
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT TEXT_CD TextCd FROM QSTN_MDCL_TEXT_INFO 
            WHERE TEXT_CD like @TextCd 
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "TextCd",
                    type: sql.NVarChar(8000),
                    value: TextCd
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["TextCd"].split(/[!_]+/).pop()
    }

    async function SelectTextCdIncludingEtc(row, QstnMdclCd, QstnItemCd) {
        var TextCd = QstnMdclCd + '!_' + QstnItemCd + '!_%'
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT TEXT_CD TextCd,
            TEXT_WORD TextWord,
            TEXT_DESC TextDesc
            FROM QSTN_MDCL_TEXT_INFO 
            WHERE TEXT_CD like @TextCd
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "TextCd",
                    type: sql.NVarChar(8000),
                    value: TextCd
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
        {
            var result = queryResult["recordset"].find(s => s["TextWord"].includes("기타") || s["TextDesc"].includes("기타"));
            return result;
        }
    }

    async function getItemCdByItemSeqno(row, QstnMdclCd, QstnItemSeqno) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT QSTN_ITEM_CD QstnItemCd FROM QSTN_ITEM_INFO 
            WHERE QSTN_MDCL_CD = @QstnMdclCd 
            AND QSTN_ITEM_SEQNO = @QstnItemSeqno
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                },
                {
                    key: "QstnItemSeqno",
                    type: sql.Int,
                    value: QstnItemSeqno
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["QstnItemCd"]
    }

    async function getItemTypeByItemSeqno(row, QstnMdclCd, QstnItemSeqno) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT QSTN_ITEM_TYPE QstnItemType FROM QSTN_ITEM_INFO 
            WHERE QSTN_MDCL_CD = @QstnMdclCd 
            AND QSTN_ITEM_SEQNO = @QstnItemSeqno
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                },
                {
                    key: "QstnItemSeqno",
                    type: sql.Int,
                    value: QstnItemSeqno
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["QstnItemType"]
    }



    async function getAnsrSeqnoByAnsrCd(row, QstnMdclCd, QstnItemCd, QstnAnsrCd) {
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT QSTN_ANSR_SEQNO QstnAnsrSeqno FROM QSTN_ANSR_INFO 
            WHERE QSTN_MDCL_CD = @QstnMdclCd 
            AND QSTN_ITEM_CD = @QstnItemCd
            AND QSTN_ANSR_CD = @QstnAnsrCd
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "QstnMdclCd",
                    type: sql.Int,
                    value: QstnMdclCd
                },
                {
                    key: "QstnItemCd",
                    type: sql.Int,
                    value: QstnItemCd
                },
                {
                    key: "QstnAnsrCd",
                    type: sql.NVarChar(8000),
                    value: QstnAnsrCd
                }
            ]
        }
        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["QstnAnsrSeqno"]
    }


    async function GetByteByTextCd(row, QstnMdclCd, QstnItemCd, QstnAnsrCd) {
        var TextCd = QstnMdclCd + '!_' + QstnItemCd + '!_' + QstnAnsrCd;
        var custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT IMG_CNTN ImgCntn
            FROM QSTN_MDCL_IMG_INFO
            WHERE TEXT_CD = @TextCd
            AND CARE_ORG_ID = @CareOrgId;
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "TextCd",
                    type: sql.NVarChar(8000),
                    value: TextCd
                }
            ]
        }

        var queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["ImgCntn"];

    }

    async function getCustNoByNameandCellNo(row, CustPhoneNo, CustName) {
        const custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT CUST_NO  CustNo
            FROM CUST_INFO
            WHERE NAME = @CustName
            AND Replace(CELL_PHONE,'-','')= Replace(@CustPhoneNo,'-','')
            AND CARE_ORG_ID = @CareOrgId;
            `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustPhoneNo",
                    type: sql.VarChar(8000),
                    value: CustPhoneNo
                },
                {
                    key: "CustName",
                    type: sql.NVarChar(8000),
                    value: CustName
                }
            ]
        }
        const queryResult = await dbCommon.executeSingleQuery(custConf)
        if (queryResult?.["rowsAffected"]?.[0] > 0)
            return queryResult["recordset"][0]["CustNo"]
    }

    async function isResultExist(row, CustNo, SrvyUrl, SrvyTitle, SrvyDate){
        const custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            SELECT *
            FROM SURVEY_RESULT_LIST
            WHERE (SRVY_URL = @SrvyUrl OR( CUST_NO = @CustNo AND  SRVY_DATE = @SrvyDate))
            AND SRVY_TITLE = @SrvyTitle
            AND CARE_ORG_ID = @CareOrgId;
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "SrvyUrl",
                    type: sql.VarChar(8000),
                    value: SrvyUrl
                },
                {
                    key: "SrvyTitle",
                    type: sql.NVarChar(8000),
                    value: SrvyTitle
                },
                {
                    key: "SrvyDate",
                    type: sql.NVarChar(8000),
                    value: SrvyDate
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                }
            ]
        }
        const queryResult = await dbCommon.executeSingleQuery(custConf);
        if (queryResult?.["rowsAffected"]?.[0] >= 0)
            return queryResult["recordset"]
        else return queryResult;
    }

    async function saveSrvyResult(row, CustNo, CustPhoneNo, CustName, SrvyUrl, SrvyTitle, SrvyDate) { //DB 자원조회(진료기록조회)

        const custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            INSERT INTO SURVEY_RESULT_LIST(
            CARE_ORG_ID, CUST_NO, CUST_PHONE, CUST_NAME,
            SRVY_URL, SRVY_TITLE, SRVY_DATE, SRVY_CHECKED)
            VALUES(
            @CareOrgId, @Custno, Replace(@CustPhoneNo,'-',''), @CustName,
            @SrvyUrl, @SrvyTitle, @SrvyDate, 'N')
                  `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "CustPhoneNo",
                    type: sql.NVarChar(8000),
                    value: CustPhoneNo
                },
                {
                    key: "CustName",
                    type: sql.NVarChar(8000),
                    value: CustName
                },
                {
                    key: "SrvyUrl",
                    type: sql.NVarChar(8000),
                    value: SrvyUrl
                },
                {
                    key: "SrvyTitle",
                    type: sql.NVarChar(8000),
                    value: SrvyTitle
                },
                {
                    key: "SrvyDate",
                    type: sql.NVarChar(8000),
                    value: SrvyDate
                }
            ]
        }
        return await dbCommon.executeSingleQuery(custConf);
    }

    async function updateSrvyResult(row, CustNo, CustPhoneNo, CustName, SrvyUrl, SrvyTitle, SrvyDate) {
        const custConf = {
            database: "Almighty",
            server: row["ServerIp"],
            port: row["ServerPort"],
            custNo: row["CustNo"],
            query: `
            UPDATE SURVEY_RESULT_LIST set
            CUST_NO = @CustNo,
            CUST_NAME = @CustName,
            CUST_PHONE = Replace(@CustPhoneNo,'-',''),
            SRVY_DATE = @SrvyDate
            WHERE (SRVY_URL = @SrvyUrl) OR  (CUST_NO = @CustNo AND SRVY_DATE = @SrvyDate)
            AND SRVY_TITLE = @SrvyTitle
            AND CARE_ORG_ID = @CareOrgId
                   `,
            args: [
                {
                    key: "CareOrgId",
                    type: sql.Char,
                    value: row["CareOrgId"]
                },
                {
                    key: "CustNo",
                    type: sql.NVarChar(8000),
                    value: CustNo
                },
                {
                    key: "CustPhoneNo",
                    type: sql.VarChar(8000),
                    value: CustPhoneNo
                },
                {
                    key: "CustName",
                    type: sql.NVarChar(8000),
                    value: CustName
                },
                {
                    key: "SrvyUrl",
                    type: sql.NVarChar(8000),
                    value: SrvyUrl
                },
                {
                    key: "SrvyTitle",
                    type: sql.NVarChar(8000),
                    value: SrvyTitle
                },
                {
                    key: "SrvyDate",
                    type: sql.NVarChar(8000),
                    value: SrvyDate
                }
            ]
        }
        return await dbCommon.executeSingleQuery(custConf);
    }
}