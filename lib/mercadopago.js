var package = require("../package"),
	request = require ("request");

var config = {
	API_BASE_URL: "https://api.mercadolibre.com",
	MIME_JSON: "application/json",
	MIME_FORM: "application/x-www-form-urlencoded"
};

MP = function (clientId, clientSecret) {
	this.__clientId = clientId;
	this.__clientSecret = clientSecret;
	this.__proxy = null;
	this.__marketplace = null;
};

/**
Enable marketplace functionality
@param initRefreshToken is the seller refresh_token, required to get futures refresh_token's
@param refreshFunction(newToken) function called on each token refresh with the newToken as parameter
*/
MP.prototype.enableMarketplace = function(initRefreshToken, refreshFunction) {
	if (typeof refreshFunction != "function") {
		throw new Error ("Must provide a callback (to get the new refresh token!)");
	}

	this.__marketplace = {
		refreshToken: initRefreshToken,
		refreshFunction: refreshFunction
	};
};

MP.version = package.version;

MP.prototype.proxy = function (proxy) {
	this.__proxy = proxy;

	return this;
};

MP.prototype.getAccessToken = function () {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	if (this.__marketplace) {
		//Get the seller token as marketplace
		MP.restClient.post(
			"/oauth/token",
			{
				"client_id": this.__clientId,
				"client_secret": this.__clientSecret,
				"grant_type": "refresh_token",
				"refresh_token": this.__marketplace.refreshToken
			},
			config.MIME_FORM,
			function(error, resp) {
				if (error) {
					next (error);
				} else if (resp.status != 200) {
					next (resp.response);
				} else {
					var newRefreshToken = resp.response.refresh_token;

					this.__marketplace.refreshToken = newRefreshToken;
					this.__marketplace.refreshFunction(newRefreshToken);

					next (null, resp.response.access_token);
				}
			}
		);
	} else {
		//Usual access_token
		MP.restClient.post(
			"/oauth/token",
			{
				"client_id": this.__clientId,
				"client_secret": this.__clientSecret,
				"grant_type": "client_credentials"
			},
			config.MIME_FORM,
			function(error, resp) {
				if (error) {
					next (error);
				} else if (resp.status != 200) {
					next (resp.response);
				} else {
					next (null, resp.response.access_token);
				}
			}
		);
	}
};

/**
Get information for specific payment
@param id
@return json
*/
MP.prototype.getPaymentInfo = function (id) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.get(
			"/collections/notifications/"+id+"?access_token="+accessToken,
			config.MIME_JSON,
			next
		);
	});
};

/**
Refund accredited payment
@param id
@return json
*/
MP.prototype.refundPayment = function (id) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.put(
			"/collections/"+id+"?access_token="+accessToken,
			{
				"status": "refunded"
			},
			config.MIME_JSON,
			next
		);
	});
};

/**
Cancel pending payment
@param id
@return json
*/
MP.prototype.cancelPayment = function (id) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.put(
			"/collections/"+id+"?access_token="+accessToken,
			{
				"status": "cancelled"
			},
			config.MIME_JSON,
			next
		);
	});
};

/**
Search payments according to filters, with pagination
@param filters
@param offset
@param limit
@return json
*/
MP.prototype.searchPayment = function (filters, offset, limit) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.get(
			"/collections/search?"+this.__build_query(filters),
			config.MIME_JSON,
			next
		);
	});
};

/**
Create a checkout preference
@param preference
@return json
*/
MP.prototype.createPreference = function (preference){
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.post(
			"/checkout/preferences?access_token="+accessToken,
			preference,
			config.MIME_JSON,
			next
		);
	});
};

/**
Update a checkout preference
@param id
@param preference
@return json
*/
MP.prototype.updatePreference = function (id, preference) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.put(
			"/checkout/preferences/"+id+"?access_token="+accessToken,
			preference,
			config.MIME_JSON,
			next
		);
	});
};

/**
Update a checkout preference
@param id
@param preference
@return json
*/
MP.prototype.getPreference = function (id) {
	var __self = this;

	var next = typeof (arguments[arguments.length -1]) == "function" ? arguments[arguments.length -1] : null;

	if (!next) {
		throw new Error ("No callback function defined");
	}

	this.getAccessToken (function (err, accessToken){
		if (err) {
			next (err);
			return;
		}

		MP.restClient.get(
			"/checkout/preferences/"+id+"?access_token="+accessToken,
			config.MIME_JSON,
			next
		);
	});
};

/*************************************************************************/
MP.prototype.__build_query = function (params) {
	var elements = [];

	for (var key in params) {
		if (params[key] == null) {
			params[key] = "";
		}

		elements.push(key+"="+escape(params[key]));
	}

	return elements.join("&");
};

MP.restClient = {
	__exec: function (uri, req, next) {
		req.uri = config.API_BASE_URL + uri;
		//req.proxy = __self.__proxy;
		req.headers = {
			"User-Agent": "MercadoPago Node.js SDK v"+MP.version+" with marketplace extension",
			"Accept": config.MIME_JSON
		};

		request(req, function(error, response, body) {
			(typeof body == "string") && (body = JSON.parse(body));

			if (error) {
				next (error);
			} else {
				next (null, {
							"status": response.statusCode,
							"response": body
						});
			}
		});
	},

	get: function (uri, contentType, next) {
		var req = {
			"method": "GET"
		};
		contentType == config.MIME_JSON && (req.json = true);

		this.__exec (uri, req, next);
	},

	post: function (uri, data, contentType, next) {
		var req = {
			"method": "POST"
		};

		contentType == config.MIME_JSON && (req.json = data);
		contentType == config.MIME_FORM && (req.form = data);

		this.__exec (uri, req, next);
	},

	put: function (uri, data, contentType, next) {
		var req = {
			"method": "PUT"
		};
		contentType == config.MIME_JSON && (req.json = data);
		contentType == config.MIME_FORM && (req.form = data);

		this.__exec (uri, req, next);
	}
};

module.exports = MP;