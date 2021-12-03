function Test(){
    const theAccessTkn = ScriptApp.getOAuthToken()
    var targetScriptId = '1pmkBw0cXDL4vhhGJLlUnHVV_r0gNPQPa72qpha0ZYTr-ZIrbVmesbuAq';
    var url =  "https://script.googleapis.com/v1/projects/"+targetScriptId +"/content";
    var response = CallGoogleAPI ("update",url,Files("10","11111111"),theAccessTkn);  
    console.log(response.getContentText);
}
function TextFiles(srvyNo,orgCustId,careOrgId){
  var surveyFile = 
  {
  'files': [{       'name': 'Code',
                    'type': 'SERVER_JS',
                    'source':  
                    "function onFormSubmit(event){ \n"+
                    "var currentForm = FormApp.getActiveForm(); \n"+
                    "var timeStamp = new Date(event.Timestamp); \n"+
                    "var formResponse = currentForm.getResponses(timeStamp).pop(); \n"+
                    "var itemResponses = formResponse.getItemResponses(); \n"+
                    "var formTitle = currentForm.getTitle().toString(); \n"+
                    `var OrgCustId= '${orgCustId}' \n`+
                    `var careOrgId = '${careOrgId}' \n`+
                    `var srvyNo = '${srvyNo}' \n`+
                    "var custName = (itemResponses[0].getResponse().toString()); \n"+
                    "var custphoneNo =(itemResponses[1].getResponse().toString()); \n"+
                    "var responseUrl = formResponse.getEditResponseUrl().toString(); \n"+
                    "var summaryUrl = currentForm.getSummaryUrl();  \n"+
                    "var responseDate = new Date(formResponse.getTimestamp().toString()); \n"+
                    "responseDate = Utilities.formatDate(responseDate ,'GMT', 'yyyy-MM-dd'); \n"+
                    "var prefilledUrl = formResponse.toPrefilledUrl().toString(); \n"+
                    "var itemResponse = formResponse.getItemResponses() \n"+
                    "var index = 2; \n"+
                    "var result = {}; \n"+
                    "while (index < itemResponse.length) \n"+
                    " { \n"+
                    "   var itemTitle = itemResponse[index].getItem().getTitle(); \n"+
                    "   itemTitle = itemTitle.split(\".\")[0];  \n"+
                    "   var itemValues = itemResponse[index].getResponse(); \n"+
                    "   if(itemResponse[index].getItem) \n"+
                    "     {\n"+
                    "       result[itemTitle] = itemValues.valueOf();\n"+
                    "     }\n"+
                    "   index ++; \n"+
                    " } \n"+
                    "console.log(result); \n"+
                    "var srvyRsltData = { \n"+
                    " 'OrgCustId' : OrgCustId, \n"+
                    " 'CareOrgId' : careOrgId, \n"+
                    " 'CustName'  : custName, \n"+
                    " 'CustPhone' : custphoneNo, \n"+
                    " 'SrvyTitle' : formTitle, \n"+
                    " 'SrvyNo'    : srvyNo,\n"+
                    " 'SrvyUrl'   : responseUrl, \n"+
                    " 'SrvyDate'  : responseDate, \n"+
                    " 'SrvyRslt'  : result \n"+
                    " }; \n"+
                    "var options = {  \n"+
                    " 'method' : 'post', \n"+ 
                    " 'contentType': 'application/json', \n"+
                    " 'payload': JSON.stringify(srvyRsltData) \n"+
                    " }; \n"+
                    "console.log(srvyRsltData);\n"+
                    "var responseSaveResult = UrlFetchApp.fetch('https://restapi.smartdoctorapi.cc/SmartSurveyNew/save-srvy-result',options); // 외부 API 발송 (UrlFetchApp) \n"+
                    "console.log(responseSaveResult.toString());\n"+
                    "}" },
                    {
                   'name': 'init',
                   'type': 'SERVER_JS',
                   'source':
                    "function Start(){ \n"+
                    "var trigger = ScriptApp.getProjectTriggers(); \n"+
                    "var survey = FormApp.getActiveForm(); \n"+
                    "if(trigger.length == 0) \n"+
                    "{ \n"+
                    "  var formId = survey.getId(); \n"+
                    "  var surveyName = survey.getTitle(); \n"+
                    "  var surveyInfo = DriveApp.getFilesByName(surveyName+\".txt\").next().getBlob().getDataAsString(); \n"+
                    "  InitSurvey(formId,survey,surveyInfo); \n"+
                    "} \n"+
                    "else \n"+
                    "{ \n"+
                    "  console.log(\"Trigger is already installed.\"); \n"+
                    "  return; \n"+
                    "} \n"+
                    "} \n"+
                    "function InitSurvey(formId, survey,surveyInfo){ \n"+
                    "  const survyBaseInfo = JSON.parse(surveyInfo).baseInfo; \n"+
                    "  const prefilledUrl = MakePrefilledUrl(survey); \n"+
                    "  SetTrigger(survey); \n"+
                    "  var srvyInfoData = SetSurveyInfo(survey,formId,survyBaseInfo,prefilledUrl); \n"+         
                    "  console.log(srvyInfoData); \n"+
                    "  var options = { \n"+
                    "                  'method' : 'post', \n"+
                    "                  'contentType': 'application/json', \n"+
                    "                  'payload' : JSON.stringify(srvyInfoData) \n"+
                    "                 }; \n"+
                    "  var responseSaveInfo = UrlFetchApp.fetch('https://restapi.smartdoctorapi.cc/SmartSurveyNew/save-srvy-info',options); \n"+ 
                    "  console.log(responseSaveInfo.getContentText()); \n"+
                    "} \n"+
                    "function SetSurveyInfo(survey,formId,survyBaseInfo,prefilledUrl){ \n"+
                    "  const summaryUrl = survey.getSummaryUrl(); \n"+
                    "  const surveyFormId = formId; \n"+
                    "  const targetScriptId = ScriptApp.getScriptId(); \n"+
                    "  var srvyInfoData = { \n"+
                    "                      'OrgCustId'  : survyBaseInfo.OrgCustId, \n"+
                    "                      'CareOrgId'   : survyBaseInfo.CareOrgId, \n"+
                    "                      'SrvyTitle'   : survyBaseInfo.Title, \n"+
                    "                      'SrvyFormId'  : surveyFormId, \n"+
                    "                      'SrvyScriptId': targetScriptId, \n"+
                    "                      'SrvyNo'      : survyBaseInfo.QstnMdclCd, \n"+
                    "                      'SrvyLogin'   : survyBaseInfo.UserGmail, \n"+
                    "                      'SrvyStat'    : summaryUrl, \n"+
                    "                      'SrvyInit'    : prefilledUrl   \n"+
                    "                      }; \n"+
                    "    return  srvyInfoData; \n"+
                    "} \n"+
                    "function MakePrefilledUrl(survey){ \n"+
                    "  var questions = survey.getItems(); \n"+
                    "  var q1 = questions[0].asTextItem(); \n"+
                    "  var q2 = questions[1].asTextItem(); \n"+
                    "  var ans1 = q1.createResponse('이름'); \n"+
                    "  var ans2 = q2.createResponse('01012345678'); \n"+
                    "  var formResponse = survey.createResponse(); \n"+
                    "  formResponse.withItemResponse( ans1 ); \n"+
                    "  formResponse.withItemResponse( ans2 ); \n"+
                    "  formResponse.submit(); \n"+
                    "  return formResponse.toPrefilledUrl(); \n"+
                    "  } \n"+
                    " function SetTrigger(form){    \n"+   
                    "  ScriptApp.newTrigger(\"onFormSubmit\") \n"+
                    "           .forForm(form) \n"+
                    "           .onFormSubmit() \n"+
                    "           .create(); \n"+
                              "} \n" },{
        'name': 'appsscript',
        'type': 'JSON',
        'source': `{
                    "oauthScopes": [
                    "https://www.googleapis.com/auth/spreadsheets.readonly",
                    "https://www.googleapis.com/auth/userinfo.email",
                    "https://www.googleapis.com/auth/forms.currentonly",
                    "https://www.googleapis.com/auth/forms",
                    "https://www.googleapis.com/auth/script.external_request",
                    "https://www.googleapis.com/auth/script.scriptapp",
                    "https://www.googleapis.com/auth/drive.readonly",
                    "https://www.googleapis.com/auth/drive"
                      ],
                      "timeZone": "Asia/Seoul",
                      "dependencies": {},
                      "exceptionLogging": "STACKDRIVER",
                    "runtimeVersion": "V8",
                    "webapp": {
                    "executeAs": "USER_ACCESSING",
                    "access": "ANYONE"
                      }
                    }`
      }]
  };
    return surveyFile;
}
