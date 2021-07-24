
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// The Stellar Smart SDK is licensed under the Attribution-NonCommercial 4.0 International (CC BY-NC 4.0), as described here: https://creativecommons.org/licenses/by-nc/4.0/
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// IMPORTANT: You must modify the section labeled "TO DO"

var gcnMaxTokens = 100000000000

class StellarSmartSDK2 {

    constructor(sReceiverAddress, sAssetCode, bIsTestnet) {
        return (async () => {
            this.sReceiverAddress = sReceiverAddress;
            this.sAssetCode = sAssetCode;
            this.bIsTestnet = bIsTestnet;
            if (bIsTestnet) {
                this.sTestnet_Horizon = "-testnet"
                this.objTestnet_NetworkPassphrase = StellarSdk.Networks.TESTNET
                this.sTestnet_RabetNetwork = "testnet"
                this.sTestnet_Stellarexpert = "testnet"
                this.sTestnet_Steexp = "testnet."
                this.sTestnet_Description = "Test"
            } else {
                this.sTestnet_Horizon = ""
                this.objTestnet_NetworkPassphrase = StellarSdk.Networks.PUBLIC
                this.sTestnet_RabetNetwork = "mainnet"
                this.sTestnet_Stellarexpert = "public"
                this.sTestnet_Steexp = ""
                this.sTestnet_Description = "Main"
            }
            this.objMessages = []
            this.nXLMUSD = 0
            this.sSenderAddress = await GetRabetSenderAddress()
            await this.GetMessages()
            this.sSenderAddress_Secret = ""
            return this;
        })();
    }

    async SendMessage(sMessage) {
        var sExtraDigits, nIndex1, nTemp, nLastSequenceDigitCount, objSenderAccount, objCurrentAccount, objServer, objDocumentPair, objTransaction, bSubmitGood, objRabetResult, nExcessTokens, objTempBig
        var objDocumentPair_sender, objDocumentPair_receiver
        var arrExtraPayments = []
        var objTotalPayments_BigNumber = new Big(0)

        sMessage = sMessage.replaceAll('^', '~').replaceAll('"', '^').substr(0, 638)

        this.sSenderAddress = await GetRabetSenderAddress()
        if (!window.rabet) {
            objDocumentPair = StellarSdk.Keypair.fromSecret(this.sSenderAddress_Secret)
            this.sSenderAddress = objDocumentPair.publicKey()
        }

        if (this.sReceiverAddress == this.sSenderAddress) {
            return
        }

        sExtraDigits = BigInt('0x' + StringToHex(sMessage)).toString()

        for (nIndex1 = 0; nIndex1 < sExtraDigits.length; nIndex1 += 16) {
            objTempBig = new Big(sExtraDigits.substr(nIndex1, 16))
            nTemp = objTempBig.div(10000000).toString()

            if (nTemp == 0) {
                nTemp = 1000000000
            }
            arrExtraPayments.push(nTemp)
            objTotalPayments_BigNumber = objTotalPayments_BigNumber.plus(nTemp)
        }
        nLastSequenceDigitCount = sExtraDigits.length % 16;
        if (nLastSequenceDigitCount == 0) {
            nLastSequenceDigitCount = 16;
        }
        nTemp = parseFloat((nLastSequenceDigitCount / 10000000).toFixed(7))
        arrExtraPayments.push(nTemp)
        objTotalPayments_BigNumber = objTotalPayments_BigNumber.plus(nTemp)
        var objBigNumber = new Big(gcnMaxTokens)
        nExcessTokens = (objBigNumber.minus(objTotalPayments_BigNumber)).toString()

        ////////////////////////////////////
        // Create Stellar Transaction START
        ////////////////////////////////////
        objServer = new StellarSdk.Server("https://horizon" + this.sTestnet_Horizon + ".stellar.org");

        objCurrentAccount = await objServer.loadAccount(this.sSenderAddress)
        objSenderAccount = new StellarSdk.Account(this.sSenderAddress, objCurrentAccount.sequence)

        objTransaction = new StellarSdk.TransactionBuilder(objSenderAccount, {
            fee: "100",
            networkPassphrase: this.objTestnet_NetworkPassphrase,
        })

        var objAsset = new StellarSdk.Asset(this.sAssetCode, this.sReceiverAddress);

        objTransaction = objTransaction.addOperation(
            StellarSdk.Operation.changeTrust({
                asset: objAsset,
            }),
        )

        objTransaction = objTransaction.addOperation(
            StellarSdk.Operation.payment({
                source: this.sReceiverAddress,
                destination: this.sSenderAddress,
                asset: objAsset,
                amount: gcnMaxTokens.toString(),
            }),
        )

        for (nIndex1 = 0; nIndex1 < arrExtraPayments.length; nIndex1++) {
            objTransaction = objTransaction.addOperation(
                StellarSdk.Operation.payment({
                    destination: this.sReceiverAddress,
                    asset: objAsset,
                    amount: arrExtraPayments[nIndex1].toString(),
                }),
            )
        }

        objTransaction = objTransaction.addOperation(
            StellarSdk.Operation.payment({
                destination: this.sReceiverAddress,
                asset: objAsset,
                amount: nExcessTokens.toString(),
            }),
        )

        objTransaction = objTransaction.setTimeout(1000000)
        objTransaction = objTransaction.build();

        if (window.rabet) {
            var objXDRdata = objTransaction.toEnvelope().toXDR().toString("base64")
            objRabetResult = await window.rabet.sign(objXDRdata, this.sTestnet_RabetNetwork)
            objTransaction = new StellarSdk.Transaction(objRabetResult.xdr, this.objTestnet_NetworkPassphrase);
        } else {
            await objTransaction.sign(objDocumentPair);
        }

        //////////////////////////////////////////////////////////////////////////
        // TO DO; START: To sign the Transaction for the Receiver, you must either  
        // enter a valid Secret for the Receiver, or call a server-side function.
        //////////////////////////////////////////////////////////////////////////
/*
        // To enter a valid Secret for the Receiver, uncomment the next two lines
        // DO NOT DO ENTER YOUR SECRET IF YOUR WEBSITE IS PUBLICLY ACCESISBLE!

        objDocumentPair = StellarSdk.Keypair.fromSecret("Enter the Receiver's Secret here")
        await objTransaction.sign(objDocumentPair);
*/
        
/*
        // To have a server-side function sign the transaction, uncomment this block
        var sXDR_FromClient = objTransaction.toEnvelope().toXDR().toString("base64")
        var objFetchResponse = await fetch("Enter the URL to your server-side script here", {
            method: 'POST',
            body: 'Enter JSON to post to your server-side script here',
            headers: { "Content-Type": "application/json" }
        })
        var sXDR_FromServer = await objFetchResponse.text()
        objTransaction = new StellarSdk.Transaction(sXDR_FromServer, this.objTestnet_NetworkPassphrase);
*/
        /////////////////////////////////////////////////////////////////////////
        // TO DO; END
        /////////////////////////////////////////////////////////////////////////

        bSubmitGood = false
        if (!await DoTrySubmitTransaction(objServer, objTransaction)) {
            for (var i = 1; i < 21; i++) {
                if (typeof (da.idSpanModalMessage) != 'undefined') {
                    da.idSpanModalMessage.innerHTML = "<font style='font-weight:normal'><font color=maroon><b>Network Congestion:</b></font> Program will wait 5 seconds, and retry a maximum of 20 times. " +
                        "This is Retry #" + i + ". <font color=maroon><b>The Main Network requires much fewer Retries.</b></font></font>"
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
                bSubmitGood = await DoTrySubmitTransaction(objServer, objTransaction)
                if (bSubmitGood) {
                    break;
                }
            }
            if (!bSubmitGood) {
                alert("ERROR: The Transaction was not completed.");
                return
            }
        }
        ////////////////////////////////////
        // Create Stellar Transaction END
        ////////////////////////////////////
        if (typeof (da.idSpanModalMessage) != 'undefined') {
            da.idSpanModalMessage.innerHTML = "Loading Messages, please wait ..."
        }
        await this.GetMessages()
    }

    async GetMessages() {
        var cnRecordsPerSearch = 200
        var nRecordsFound = cnRecordsPerSearch
        var arrTransactionHashes_all = []
        var arrTransactionHashes_unique = []
        var objPaymentsForOneTransaction = []
        var arrMessages = []
        var sMessage, sEncodedDigits, objFetchResponse, objResult, nIndex1, nIndex2, sURL, sFinalMessage, sLastPayment_amount, nLastPayment_digits, sTemp, objBigTemp

        this.objMessages = []
        // Get XLM_USD
        objFetchResponse = await fetch('https://api.pro.coinbase.com/products/XLM-USD/ticker');
        objResult = await objFetchResponse.json()
        this.nXLMUSD = parseFloat(objResult.price)

        sURL = "https://horizon" + this.sTestnet_Horizon + ".stellar.org/accounts/" + this.sReceiverAddress + "/payments?limit=" + cnRecordsPerSearch

        var objRetrievedPayments = []

        while (nRecordsFound == cnRecordsPerSearch) {
            try {
                objFetchResponse = await fetch(sURL);
                objResult = await objFetchResponse.json()
                var aobjRecords = objResult._embedded.records
            }
            catch (e) {
                break
            }
            for (var i = 0; i < aobjRecords.length; i++) {
                if (aobjRecords[i].transaction_successful == true && aobjRecords[i].asset_code == this.sAssetCode && aobjRecords[i].to == this.sReceiverAddress) {
                    objRetrievedPayments.push({
                        "from": aobjRecords[i].from, "amount": aobjRecords[i].amount, "transaction_hash": aobjRecords[i].transaction_hash, "timestamp": new Date(Date.parse(aobjRecords[i].created_at)).getTime() / 1000
                    })
                    arrTransactionHashes_all.push(aobjRecords[i].transaction_hash)
                }
            }
            nRecordsFound = objResult._embedded.records.length
            sURL = objResult._links.next.href
        }

        var arrTransactionHashes_unique = arrTransactionHashes_all.filter((v, i, a) => a.indexOf(v) === i);

        // Concatenate Payments assigned to each Transaction Hash
        for (nIndex1 = 0; nIndex1 < arrTransactionHashes_unique.length; nIndex1++) {
            objPaymentsForOneTransaction = objRetrievedPayments.filter(function (el) {
                return el.transaction_hash == arrTransactionHashes_unique[nIndex1]
            });

            if (objPaymentsForOneTransaction.length > 2) {
                sEncodedDigits = ""
                for (nIndex2 = 0; nIndex2 < objPaymentsForOneTransaction.length - 3; nIndex2++) {
                    objBigTemp = new Big(objPaymentsForOneTransaction[nIndex2].amount)
                    sTemp = (objBigTemp.times(10000000)).toString()

                    sEncodedDigits += sTemp.padStart(16, '0')
                }

                objBigTemp = new Big(objPaymentsForOneTransaction[objPaymentsForOneTransaction.length - 3].amount)
                sLastPayment_amount = (objBigTemp.times(10000000)).toString()
                nLastPayment_digits = Math.round(objPaymentsForOneTransaction[objPaymentsForOneTransaction.length - 2].amount * 10000000)
                sEncodedDigits += sLastPayment_amount.padStart(nLastPayment_digits, '0')
                sFinalMessage = HexToString(dec2hex(sEncodedDigits))
                this.objMessages.push({
                    "from": objPaymentsForOneTransaction[0].from,   
                    "message": sFinalMessage,
                    "timestamp": objPaymentsForOneTransaction[0].timestamp
                })
            }
        }
        this.objMessages.sort((a, b) => (a.timestamp < b.timestamp) ? 1 : ((b.timestamp < a.timestamp) ? -1 : 0))
    }
}

function dec2hex(str) {
    var dec = str.toString().split(''), sum = [], hex = [], i, s
    while (dec.length) {
        s = 1 * dec.shift()
        for (i = 0; s || i < sum.length; i++) {
            s += (sum[i] || 0) * 10
            sum[i] = s % 16
            s = (s - sum[i]) / 16
        }
    }
    while (sum.length) {
        hex.push(sum.pop().toString(16))
    }
    return hex.join('')
}

function StringToHex(sString) {
    return sString.split("")
        .map(c => c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
}

function HexToString(sEncodedHex) {
    return sEncodedHex.split(/(\w\w)/g)
        .filter(p => !!p)
        .map(c => String.fromCharCode(parseInt(c, 16)))
        .join("")
}

async function DoTrySubmitTransaction(objServer, objTransaction) {
    try {
        await objServer.submitTransaction(objTransaction)
        return true
    }
    catch (e) {
        return false
    }
}

async function GetRabetSenderAddress() {
    if (window.rabet) {
        var objRabet = await window.rabet.connect()
        return objRabet.publicKey
    } else {
        return ""
    }
}
