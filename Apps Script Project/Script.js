function doPost(e) {
    //Declare Global Variable and Map of functions
    surveyDataAll = JSON.parse(e.postData.contents);
    SetGlobalVariables(surveyDataAll);
    itemCreateFunctionMap = ItemCreateFunctionTablebyType();
  
    if(rollBackFlag.toString() == "true")
    {
       try{
         console.log("In RollBack")
         RollBack();
       }
       catch(e){
         var httpCode =  { StatusCode : "40x", Rejection  : "Roll Back에 실패했습니다." };
         var rollBackFail = true;
       }
       if(rollBackFail){
         console.log(httpCode);
         return HtmlService.createHtmlOutput(JSON.stringify(httpCode)); 
       }
     }
     try{
       var httpResponse = AutoSurveyCreator();
       if(httpResponse.toString() == "Create")
       var httpCode = { StatusCode : "201", Success : "설문 생성을 완료하였습니다."};
       else if (httpResponse.toString() == "Update")
       var httpCode = { StatusCode : "200", Success : "설문 업데이트를 완료하였습니다."};
     }
     catch(e){
       console.log(e)
       var httpCode = { StatusCode : "400", Rejection  : "작업을 실패했습니다." };
     }
     console.log(httpCode)
     return HtmlService.createHtmlOutput(JSON.stringify(httpCode));
     }
  
  function SetGlobalVariables(surveyDataAll)
  {
     surveyBaseInfo = surveyDataAll.baseInfo;
     orgCustId = surveyBaseInfo.OrgCustId;
     surveyNo = surveyBaseInfo.QstnMdclCd;
     careOrgId = surveyBaseInfo.CareOrgId;
     surveyName = surveyBaseInfo.Title;
     rollBackFlag = surveyBaseInfo.RollBackFlag; 
     fileName = surveyName;
     folderName = orgCustId;
     topLevelFolder = DriveApp.getFoldersByName("스마트설문").next();
     setupFiles = (TextFiles(surveyNo,orgCustId,careOrgId));
     theAccessToken = ScriptApp.getOAuthToken();
  }
  
  function RollBack(){
      if(topLevelFolder.getFoldersByName(folderName.toString()).hasNext()== true){
         var currentFolder = topLevelFolder.getFoldersByName(folderName.toString()).next();
         if(currentFolder.getFilesByName(surveyName.toString()).hasNext()== true)
         {
             if(DriveApp.getFilesByName(surveyName.toString()).next().setTrashed(true))
             return true; 
             else return false;
         }
         else return false;
       }
  }
  
  function AutoSurveyCreator() {
   console.log()
    var currentFolder = topLevelFolder.getFoldersByName(folderName.toString()).hasNext() 
                      ? topLevelFolder.getFoldersByName(folderName.toString()).next() : topLevelFolder.createFolder(folderName);
    var folderId = currentFolder.getId(); 
    if(currentFolder.getFilesByName(surveyName.toString()).hasNext())
    {
      console.log("Survey Is Already Exist!");
      var surveyData = JSON.parse(GetSurveyData());
      var flagCreateOrUpdate = "Update";
      var formId = surveyData.Survey_FormID;
      var targetScriptId  = surveyData.Survey_ScriptID;
      var txtInfo = UpdateOrCreateSurveyTextFile(fileName,surveyDataAll);
      UpdateSurvey(surveyDataAll, formId);
      MovetoFolder(txtInfo,folderId);
    }
    else
    {
      var flagCreateOrUpdate = "Create";
      var formId = CreateFormInFolder(folderId);
      var targetScriptId = GetNewSurveyScriptId(formId);
    }
    var responseSaveData = JSON.parse(SaveSurveyData(targetScriptId,formId));
    var responseUpdateProject = JSON.parse(UpdateProjectContent(targetScriptId,setupFiles,theAccessToken));
    return flagCreateOrUpdate;
   }
  
   function GetNewSurveyScriptId(formId)
   {
     var survey = FormApp.openById(formId);
     var script = CreateScriptProject(survey,theAccessToken);
     var targetScriptId = JSON.parse(script).scriptId;
     return targetScriptId; 
   }
  
   function CreateFormInFolder(folderId)
   {
     var survey = CreateSurvey(surveyDataAll, surveyName.toString());
     var txtInfo = UpdateOrCreateSurveyTextFile(fileName,surveyDataAll);
     MovetoFolder(survey, folderId);
     MovetoFolder(txtInfo,folderId); 
     return survey.getId();
   }
  
   function MovetoFolder(survey, folderId)
   {
     var file = DriveApp.getFileById(survey.getId());
     var folder = DriveApp.getFolderById(folderId);
     file.moveTo(folder);
   }
  
   function CreateScriptProject(survey,theAccessToken)
   {
     var url = "https://script.googleapis.com/v1/projects"
     formData = {
     'title': orgCustId.toString() +"-"+ surveyNo.toString(),
     'parentId': survey.getId().toString()
     }
     var script =  CallGoogleAPI ("post",url,formData,theAccessToken);
     return script;
   }
  
   function UpdateProjectContent(targetScriptId,setupFiles,theAccessToken)
   {
     var url =  "https://script.googleapis.com/v1/projects/"+targetScriptId +"/content";
     var responseUpdate = CallGoogleAPI ("put",url,setupFiles,theAccessToken);
     return responseUpdate;
   }
  
   function SaveSurveyData(targetScriptId,formId)
   {
     var srvyInfoData = 
         {
           'OrgCustId'   : orgCustId,
           'CareOrgId'   : careOrgId,
           'SrvyTitle'   : surveyName,
           'SrvyScriptId': targetScriptId,
           'SrvyFormId'  : formId,
           'SrvyNo'      : surveyNo
         };   
     var options = {
           'method' : 'post',
           'contentType': 'application/json',
           'payload' : JSON.stringify(srvyInfoData)
         }; 
       var response = UrlFetchApp.fetch('https://restapi.smartdoctorapi.cc/SmartSurveyNew/save-srvy-info',options);
       return response 
   }
   
   function GetSurveyData()
   {
     var srvyInfoData = {
        'OrgCustId' : orgCustId,
        'CareOrgId' : careOrgId,
        'SrvyTitle' : surveyName,
        'SrvyNo'    : surveyNo
       };
     var options = {
        'method' : 'post',
        'contentType': 'application/json',
        'payload' : JSON.stringify(srvyInfoData)
        }; 
     var response =  UrlFetchApp.fetch('https://restapi.smartdoctorapi.cc/SmartSurveyNew/get-srvy-id' ,options);
     return response;
   }
  
   function UpdateOrCreateSurveyTextFile(fileName, surveyDataAll)
   {
     if(DriveApp.getFilesByName(fileName+".txt").hasNext())
     {
       DriveApp.getFilesByName(fileName+".txt").next().setTrashed(true);
     }
     var content = JSON.stringify(surveyDataAll);  
     var textfile = DriveApp.createFile(fileName+".txt",content);
     return textfile;
   }
  
   function CreateSurvey(surveyDataAll, surveyName) 
   {
     var form = FormApp.create(surveyName.toString());
     form.setTitle(surveyName.toString());
     form.setAcceptingResponses(true);
     form.setAllowResponseEdits(true);
  
     var nameItem = form.addTextItem();
     nameItem.setTitle('성함');
     nameItem.setRequired(true);
   
     var phoneItem = form.addTextItem();
     phoneItem.setTitle('연락처');
     phoneItem.setRequired(true);
     form.addPageBreakItem();
  
     var index = 0;
     while(index < surveyDataAll.surveyItem.length)
     {  
       CreateItem(form, surveyDataAll.surveyItem[index])
       index++;
     }
     console.log("설문 생성 완료")
     return form;
    }
  
   function UpdateSurvey(surveyDataAll,formId) 
   {
     console.log(formId);
     var form = FormApp.openById(formId);
     while (form.getItems().length >3)
     {
       form.deleteItem(3); 
     }
     var index = 0;
     while(index < surveyDataAll.surveyItem.length)
     {     
       CreateItem(form, surveyDataAll.surveyItem[index])
       index++;
     }
     console.log("설문 업데이트 완료")
     return form;
   }
  
  function CreateItem(form, item){
    if(item == null)
     {
       console.log("Item is null")
       return;
     }
    else
     {
       try{
          var itemofType = itemCreateFunctionMap[item.Type.toString()](form,item);        
          SetOptions(item,itemofType);
       }catch(e){
        console.log(e);
        }
     }
  }
  
  function ItemCreateFunctionTablebyType()
  {
    var functionMap = {
        "Checkboxitem" : CreateCheckBoxItem,
        "Textitem" : CreateTextItem,
        "Griditem" : CreateGridItem,
        "Multiplechoiceitem" : CreateMultipleChoiceItem,
        "Imageitem" : CreateImageItem,
        "PageBreak" : CreatePageBreak
        }
    return functionMap;
  }
  
  function CreateCheckBoxItem(form,currentItem)
  {
     var itemWithType = form.addCheckboxItem();
         itemTitle = currentItem.QstnItemSeqno + ". " + currentItem.Title;
         console.log(itemWithType.setTitle(itemTitle.toString()));
         itemWithType.setChoiceValues(currentItem.Choices); 
     return itemWithType;
  }
  
  function CreateTextItem(form,currentItem)
  {
     var itemWithType = form.addTextItem()
                            .setTitle(currentItem.QstnItemSeqno + ". " + currentItem.Title); 
     return itemWithType;
  }
  
  function CreateGridItem(form,currentItem)
  {
     var itemWithType = form.addGridItem();
         itemTitle = currentItem.QstnItemSeqno + ". " + currentItem.Title;
         thisItem.setTitle(itemTitle.toString())
         .setRows(currentItem.Rows)
         .setColumns(currentItem.Columns);
     return itemWithType;
  }
  
  function CreateMultipleChoiceItem(form,currentItem)
  {
     var itemWithType = form.addMultipleChoiceItem();
         itemTitle = currentItem.QstnItemSeqno + ". " + currentItem.Title;
         itemWithType.setTitle(itemTitle.toString());
         itemWithType.setChoiceValues(currentItem.Choices);
     return itemWithType;
  }
  
  function CreateImageItem(form,currentItem)
  {
     var itemText = currentItem.ImgFileName;
     var name = itemText.split(".")[0];
     var imgType = itemText.split(".")[1];
     var base64 = currentItem.TitleImgCntn; 
     var bytes = Utilities.base64Decode(base64);
       if(imgType == "png")
           var imgblob = Utilities.newBlob(bytes,MimeType.PNG,name);
       else if(imgType == "jpeg")
           var imgblob = Utilities.newBlob(bytes,MimeType.JPEG,name);
       else if(imgType == "bmp")
           var imgblob = Utilities.newBlob(bytes,MimeType.BMP,name);
       else if(imgType == "svg")
           var imgblob = Utilities.newBlob(bytes,MimeType.SVG,name);
       else if(imgType == "gif")
           var imgblob = Utilities.newBlob(bytes,MimeType.GIF,name);
       form.addImageItem()
           .setImage(imgblob );
       var itemWithType = form.addMultipleChoiceItem()
           itemWithType.setTitle(currentItem.QstnItemSeqno + ". " + currentItem.Title)
           itemWithType.setChoiceValues(currentItem.Choices);
       return itemWithType;
  }
  
  function CreatePageBreak(form)
  {
   form.addPageBreakItem();
  }
  
  function SetOptions(currentItem,itemWithType)
  {
    if(currentItem.Type =="Checkboxitem" || currentItem.Type =="Multiplechoiceitem") 
    {
      if(currentItem.OtherOptions == "Y"){ itemWithType.showOtherOption(true);}
     
      else if(currentItem.OtherOptions == "N"){itemWithType.showOtherOption(false);}
    }     
    if(currentItem.HelpString != ""){itemWithType.setHelpText(currentItem.HelpString);}
  
    if(currentItem.IsRequired == "Y"){itemWithType.setRequired(true);}
  }
  
  function CallGoogleAPI (method,url,payload,theAccessToken)
   {
     var options = {
       'method' : method.toString(),     
       "muteHttpExceptions": false,
       "headers": {
         'Authorization': 'Bearer ' +  theAccessToken.toString()
         },
       "contentType": "application/json",
       "payload" : JSON.stringify(payload) 
       };  
         var script = UrlFetchApp.fetch(url.toString(),options);
         return script;
    }
  
  
  