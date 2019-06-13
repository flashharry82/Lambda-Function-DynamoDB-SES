const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const responseHeaders = {
        'Access-Control-Allow-Origin': process.env.WEBSITE_ADDRESS,
        'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin'
    };
    
    var id = new Date().getTime();
    var requestBody = JSON.parse(event.body);
    var email = requestBody.email;
    var message = requestBody.message;
    
    var response = await recordContact(id,email,message).then(() => {
        return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify('Success!')
        };
    }).catch((err) => {
        return {
            statusCode: 500,
            headers: responseHeaders,
            body: JSON.stringify('Failed DB!')
        };
    });
    if (response.statusCode == 500){
        console.log("FAILED DB");
        return response;
    }
    else{
        response = await sendEmail(email,message).then(() => {
            return {
                statusCode: 200,
                headers: responseHeaders,
                body: JSON.stringify('Success!')
            };
        }).catch((err) => {
            return {
                statusCode: 500,
                headers: responseHeaders,
                body: JSON.stringify('Failed email!')
            };
        });
    }
    return response;
};

async function recordContact(id, email, message) {
    var params = {
      TableName: process.env.DB_TABLE_NAME,
        Item: {
            id: id,
            email: email,
            message: message
        }
    };
    return ddb.put(params).promise();
}

async function sendEmail(email,message){
    AWS.config.update({ region: process.env.REGION });
    
    if (!email.match(/^[^@]+@[^@]+$/)) {
        context.done(null, "Failed");
        return;
    }
  
    const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
      </head>
      <body>
        <p>Hi,</p>
        <p>${email}</p>
        <p>${message}</p>
      </body>
    </html>
    `;
    
    const textBody = `
    Hi,
    ${email}
    ${message}
    `;
    
    
    const params = {
    Destination: {
      ToAddresses: [process.env.ADMIN_EMAIL]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody
        },
        Text: {
          Charset: "UTF-8",
          Data: textBody
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Email Subject Line Here"
      }
    },
    Source: process.env.EMAIL_SOURCE
    };

    // Create the promise and SES service object
    return new AWS.SES({ apiVersion: "2010-12-01" })
    .sendEmail(params)
    .promise();
    
}
