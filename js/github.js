/*globals $,console,d3,cookieJar */

/*!
 * github.js
 *
 * Copyright 2016 Timothy Davenport; Licensed MIT
 */

 /*
GitHub API Reference: https://api.github.com
    [ ] "current_user_url": "https://api.github.com/user",
    [-] "current_user_authorizations_html_url": "https://github.com/settings/connections/applications{/client_id}",
    [-] "authorizations_url": "https://api.github.com/authorizations",
    [-] "code_search_url": "https://api.github.com/search/code?q={query}{&page,per_page,sort,order}",
    [-] "emails_url": "https://api.github.com/user/emails",
    [ ] "emojis_url": "https://api.github.com/emojis",
    [-] "events_url": "https://api.github.com/events",
    [-] "feeds_url": "https://api.github.com/feeds",
    [ ] "followers_url": "https://api.github.com/user/followers",
    [ ] "following_url": "https://api.github.com/user/following{/target}",
    [ ] "gists_url": "https://api.github.com/gists{/gist_id}",
    [-] "hub_url": "https://api.github.com/hub",
    [-] "issue_search_url": "https://api.github.com/search/issues?q={query}{&page,per_page,sort,order}",
    [?] "issues_url": "https://api.github.com/issues",
    [-] "keys_url": "https://api.github.com/user/keys",
    [-] "notifications_url": "https://api.github.com/notifications",
    [?] "organization_repositories_url": "https://api.github.com/orgs/{org}/repos{?type,page,per_page,sort}",
    [?] "organization_url": "https://api.github.com/orgs/{org}",
    [-] "public_gists_url": "https://api.github.com/gists/public",
    [x] "rate_limit_url": "https://api.github.com/rate_limit",
    [x] "repository_url": "https://api.github.com/repos/{owner}/{repo}",
    [-] "repository_search_url": "https://api.github.com/search/repositories?q={query}{&page,per_page,sort,order}",
    [ ] "current_user_repositories_url": "https://api.github.com/user/repos{?type,page,per_page,sort}",
    [ ] "starred_url": "https://api.github.com/user/starred{/owner}{/repo}",
    [ ] "starred_gists_url": "https://api.github.com/gists/starred",
    [?] "team_url": "https://api.github.com/teams",
    [x] "user_url": "https://api.github.com/users/{user}",
    [-] "user_organizations_url": "https://api.github.com/user/orgs",
    [ ] "user_repositories_url": "https://api.github.com/users/{user}/repos{?type,page,per_page,sort}",
    [-] "user_search_url": "https://api.github.com/search/users?q={query}{&page,per_page,sort,order}"
*/

/*
Github API to use:
    - [ ] "current_user_url": "https://api.github.com/user"
    - [ ] "current_user_repositories_url": "https://api.github.com/user/repos{?type,page,per_page,sort}"
    - [x] "user_url": "https://api.github.com/users/{user}"
    - [ ] "user_repositories_url": "https://api.github.com/users/{user}/repos{?type,page,per_page,sort}"
    - [ ] "emojis_url": "https://api.github.com/emojis"
    - [ ] "followers_url": "https://api.github.com/users/{user}/followers"
    - [ ] "following_url": "https://api.github.com/users/{user}/following"
    - [ ] "gists_url": "https://api.github.com/users/{user}/gists"
    - [x] "rate_limit_url": "https://api.github.com/rate_limit"
    - [x] "repository_url": "https://api.github.com/repos/{owner}/{repo}"
    - [ ] "starred_url": "https://api.github.com/user/starred"
    - [ ] "starred_gists_url": "https://api.github.com/gists/starred"

    * on all append: '?=access_token{access_token}'
*/

function parse_headers(header_string) {
    /* Parses a header string as returned by xhr.getAllResponseHeaders()
    Example Header:
        X-OAuth-Scopes:
        X-RateLimit-Remaining: 4878
        X-Accepted-OAuth-Scopes:
        Last-Modified: Sat, 24 Oct 2015 21:02:27 GMT
        ETag: W/"bc440d9ad7a60bc67bbf7f3513528724"
        Content-Type: application/json; charset=utf-8
        Cache-Control: private, max-age=60, s-maxage=60
        X-RateLimit-Reset: 1455024495
        X-RateLimit-Limit: 5000
    */
    var lines = header_string.trim().split('\n');
        headers = {},
        line = '',
        key = '',
        val = '',
        number = null;
    // loop thru header lines
    for (line in lines) {
        // split line on first `:` for key:val par
        keyval = lines[line].split(/:(.*)/);
        key = keyval[0].trim();
        val = keyval[1].trim();
        // try to parse value as null
        if (val === "") {
            val = null;
        } else {
            // try to parse as number
            number = parseInt(val);
            if (!isNaN(number)) {
                val = number;
            } else {
                // try to parse as number
                date = new Date(val);
                if (!isNaN(date.getTime())) {
                    val = date;
                }
                // leave as string
            }
        }
        // Place in object
        headers[key] = val;
    }
    return headers;
}

var github = {
    // API Defaults and Constants
    api_url : 'https://api.github.com',
    client_id : '85bd6112f2a60a7edd66',
    oauth_url : 'https://github.com/login/oauth/authorize?',
    client_redirect : 'http://aggregit.com/#!/authenticate',
    oauth_proxy_url : 'http://aggregit-proxy-576273.appspot.com/?',
    auth_scope : '',
    // API Access
    code : '',
    state : '',
    access_token : '',
    rate_limit : 60,
    remaining_calls : 60,
    rate_limit_reset : 0,
    // Authorize and Authenticate
    authorize : function() {
        console.log('Getting GitHub Authorization');
        var url = '',
            state = Math.random().toString(36).substr(2, 8) + Math.random().toString(36).substr(2, 8);
        // store state in cookie for later
        cookieJar.set('state', state);
        // Create url to access GitHub authentication
        url = github_oauth_url + $.param({
            'client_id' : github_id,
            'redirect_url' : github_callback,
            'scope' : github_scope,
            'state' : state
        });
        // Request authorization
        console.log(url);
        location.href = url;
    },
    authenticate : function() {
        console.log('Getting GitHub Authentication');
        // Get GitHub authentication from redirected url
        var auth = deparam(window.location.search),
            url = '',
            username = '';
        // Check that state is valid
        if (cookieJar.get('state') === auth['state'] ) {
            console.log('state is good');
            // Turn authorization code into access token
            url = oauth_proxy_url + $.param(auth);
            $.getJSON(url, function(access) {
                if (access.hasOwnProperty('access_token')) {
                    console.log('token is good');
                    console.log('authenticated');
                    cookieJar.set('access_token', access['access_token']);
                    cookieJar.set('valid_auth', true);
                    cookieJar.set('auth_time', (new Date()).toISOString());
                    username = cookieJar.has('searchUser') ? cookieJar.get('searchUser') : '';
                    location.href = location.href.replace(location.search, '').replace(location.hash, '') + '#!/user=' + username;
                } else {
                    console.log('error: no token');
                    location.href = location.href.replace(location.search, '').replace(location.hash, '') + '#!/home';
                }
            });
        } else {
            console.log('state is bad');
            console.log('did not authenticate');
            location.href = location.href.replace(location.search, '').replace(location.hash, '') + '#!/home';
        }
    },
    // Request Handler
    request_handler : function(request) {
        var url = this[request + '_url'];
        // Make sure there are enough API call available
        if (this.remaining_calls > 0) {
            console.log('Making API call');
            return $.getJSON(url, this.response_handler);
        } else {
            console.log('Not enough API calls left');
            return false;
        }
    },
    // Response Handler
    response_handler : function(data, status, xhr) {
        // parse out header info and original url
        var headers = parse_headers(xhr.getAllResponseHeaders()),
            request_url = this.url;

        // store rate limits
        github.rate_limit = headers['X-RateLimit-Limit'];
        github.remaining_calls = headers['X-RateLimit-Remaining'];
        github.rate_limit_reset = headers['X-RateLimit-Reset']; // new Date(this.rate_limit_reset * 1000)

        // check Response Status
        console.log(xhr.status);
        // response was successful, continue processing
        if (xhr.status === 200) {
            console.log('response was successful');
            console.log(data);

        // response has a redirect
        } else if (xhr.status === 301 || xhr.status === 302 || xhr.status === 307) {
            console.log('response has a redirect');
            console.log(data);

        // response has a client error
        } else if (xhr.status === 400 || xhr.status === 422) {
            console.log('response has a client error');
            console.log(data);

        // response is unauthorized
        } else if (xhr.status === 401) {
            console.log('response is unauthorized');
            console.log(data);

        // response is forbidden or not found
        } else if (xhr.status === 404 || xhr.status === 403) {
            console.log('response is forbidden or no found');
            console.log(data);

        } else {
            console.log('reponse has unknown status');
            console.log(data);
        }

    },
    // API request urls
    // build params, starts with access_token if it exists then extends with other_params if neccesary
    build_params : functions(other_params) {
        var params = {};
        // add access_token to params if it exists
        if (this.access_token !== '') {
            params['access_token'] = this.access_token;
        }
        // extend params
        $.extend(params, other_params);
        // stringify as url params
        params = $.param(params);
        // prepend param identifier if paramas exist
        if (params) {
            params = '?=' + params;
        }
        return params;
    },
    current_user_url : function () {
        // https://api.github.com/user
        var url = [this.api_url, 'user'].join('/') + this.build_params();
        return url;
    },
    current_user_repositories_url : function (type, page, per_page, sort) {
        // https://api.github.com/user/repos{?type,page,per_page,sort}
        var url = '',
            params = {};
        if (type) { params['type'] = type; }
        if (page) { params['page'] = page; }
        if (per_page) { params['per_page'] = per_page; }
        if (sort) { params['sort'] = sort; }
        url = [this.api_url, 'user', 'repos'].join('/') + this.build_params();
        return url;
    },
    user_url : function (user) {
        // https://api.github.com/users/{user}
        var url = [this.api_url, 'users', user].join('/') + this.build_params();
        return url;
    },
    user_repositories_url : function (user, type, page, per_page, sort) {
        // https://api.github.com/users/{user}/repos{?type,page,per_page,sort}
        var url = '',
            params = {};
        if (type) { params['type'] = type; }
        if (page) { params['page'] = page; }
        if (per_page) { params['per_page'] = per_page; }
        if (sort) { params['sort'] = sort; }
        url = [this.api_url, 'users', user, 'repos'].join('/') + this.build_params();
        return url;
    },
    emojis_url : function () {
        // https://api.github.com/emojis
        var url = [this.api_url, 'emojis'].join('/') + this.build_params();
        return url;
    },
    followers_url : function (user) {
        // https://api.github.com/users/{user}/followers
        var url = [this.api_url, 'users', user, 'followers'].join('/') + this.build_params();
        return url;
    },
    following_url : function (user) {
        // https://api.github.com/users/{user}/following
        var url = [this.api_url, 'users', user, 'following'].join('/') + this.build_params();
        return url;
    },
    gists_url : function (user) {
        // https://api.github.com/users/{user}/gists
        var url = [this.api_url, 'users', user, 'gists'].join('/') + this.build_params();
        return url;
    },
    rate_limit_url : function () {
        // https://api.github.com/rate_limit
        var url = [this.api_url, 'rate_limit'].join('/') + this.build_params();
        return url;
    },
    repository_url : function (owner, repo) {
        // https://api.github.com/repos/{owner}/{repo}
        var url = [this.api_url, 'repos', owner, repo].join('/') + this.build_params();
        return url;
    },
    starred_url : function () {
        // https://api.github.com/user/starred
        var url = [this.api_url, 'user', 'starred'].join('/') + this.build_params();
        return url;
    },
    starred_gists_url : function () {
        // https://api.github.com/gists/starred
        var url = [this.api_url, 'gists', 'starred'].join('/') + this.build_params();
        return url;
    }
};

var API_URL = 'https://api.github.com',
    REPO_STATS_URLS = ['contributors', 'commit_activity', 'code_frequency', 'participation', 'punch_card'],
    HOUR_IN_MS = 60 * 60 * 1000;

function getRateLimit(access_token) {
    /*
    Check rate limits for user
    If access_token is valid API returns:
    {
        "resources": {
            "core": {
                "limit": 5000,
                "remaining": 4983,
                "reset": 1454771069
            },
            "search": {
                "limit": 30,
                "remaining": 30,
                "reset": 1454767529
            }
        },
        "rate": {
            "limit": 5000,
            "remaining": 4983,
            "reset": 1454771069
        }
    }
    If the access_token is invalid the API returns:
    {
        "message": "Bad credentials",
        "documentation_url": "https://developer.github.com/v3"
    }
    */
    // Build url
    var rate_limit_url  = [API_URL, 'rate_limit'].join('/') + access_token;
    return $.getJSON(rate_limit_url);
}

function check_authentication(callback) {
    /* Uses the rate_limit API to check if user authorization is still valid */
    console.log('Checking GitHub Authorization');
    // Check for token
    var token = cookieJar.has('access_token') ? '?access_token=' + cookieJar.get('access_token') : '';

    // If token exists, user authenticated at one point... check if still valid
    if (token) {
        console.log('Has Access Token, check if still valid');

        // Check rate
        $.when(getRateLimit(token)).done(function (rate_limit) {
            console.log('Rate Limit request done');
            if (rate_limit["message"] === "Bad credentials") {
                console.log('Token is not valid');
                cookieJar.set('valid_auth', false);
                callback(false);
            } else {
                console.log('Token is still valid');
                cookieJar.set('valid_auth', true);
                cookieJar.set('auth_time', (new Date()).toISOString());
                callback(true);
            }
        }).fail(function (response) {
            console.log('Rate Limit request failed');
            console.log('Token is not valid');
            cookieJar.set('valid_auth', false);
            callback(false);
        });

    } else {
        console.log('No Access Token');
        cookieJar.set('valid_auth', false);
        callback(false);
    }
}

function getGitHubUser(username, callback) {
    var token = cookieJar.has('access_token') && cookieJar.get('valid_auth') ? '?access_token=' + cookieJar.get('access_token') : '',
        api_calls = 0,
        user = {
            "login": "",
            "id": 0,
            "avatar_url": "",
            "html_url": "",
            "site_admin": false,
            "name": "",
            "company": "",
            "blog": "",
            "location": "",
            "email": "",
            "hireable": false,
            "public_repos": 0,
            "public_gists": 0,
            "followers": 0,
            "following": 0,
            "created_at": null,
            "updated_at": null,
            "is_cookie" : false
        },
        repo = {
            "name": "",
            "owner": {"login": ""},
//                "html_url": "",
            "description": "",
            "fork": false,
            "created_at": null,
            "updated_at": null,
            "pushed_at": null,
            "size": 0,
            "stargazers_count": 0,
            "watchers_count": 0,
            "has_pages": true,
            "forks_count": 0,
            "open_issues_count": 0,
            "is_cookie" : false
        },
        repos = [];

    function getUser(username) {
        var userCookie = null,
            userData = null,
            dfUser =  null,
            blank =  null,
            userKey = unurl(username);

        // check if cookies exists for username
        if (cookieJar.has(userKey)) {
            userCookie = cookieJar.get(userKey);
            // check if it is over an hour old
            if ((new Date() - new Date(userCookie.time)) < HOUR_IN_MS) {
                userData = userCookie.data;
            }
        }
        // only look up data if it is old or if we ran out of api calls
        if (userData || api_calls > 60) {
            // create a deferred object so we can use
            // the same interface for cookie data as api data
            dfUser = $.Deferred();
            if (userData) {
                console.log('using cookie: {0}'.format(userKey));
                dfUser.resolve(userData);
            } else {
                console.log('TOO MANY api calls: {0}'.format(api_calls));
                blank = $.extend(true, {}, user);
                dfUser.resolve(blank);
            }
            return dfUser;
        } else {
            api_calls += 1;
            console.log('({0}) making request: {1}'.format(api_calls, username));
            return $.getJSON([API_URL, 'users', username].join('/') + token);
        }
    }

    function getRepos(username) {
        var reposCookie = null,
            reposData = null,
            dfRepos =  null,
            blank =  null,
            repos_url = [API_URL, 'users', username, 'repos'].join('/') + token;

        // check if cookies exists for username
        if (cookieJar.has(repos_url)) {
            reposCookie = cookieJar.get(repos_url);
            // check if it is over an hour old
            if ((new Date() - new Date(reposCookie.time)) < HOUR_IN_MS) {
                reposData = reposCookie.data;
            }
        }
        // only look up data if it is old or if we ran out of api calls
        if (reposData || api_calls > 59) {
            // create a deferred object so we can use
            // the same interface for cookie data as api data
            dfRepos = $.Deferred();
            if (reposData) {
                console.log('using cookie: {0}'.format(repos_url));
                dfRepos.resolve(reposData);
            } else {
                console.log('TOO MANY api calls: {0}'.format(api_calls));
                blank = $.extend(true, {}, repo);
                dfRepos.resolve([blank]);
            }
            return dfRepos;
        } else {
            api_calls += 1;
            console.log('({0}) making request: {1}'.format(api_calls, repos_url));
            return $.getJSON(repos_url);
        }
    }

    // get the user
    $.when(getUser(username)).done(function (userData) {
        var key = '',
            userCookie = null,
            storeResponse = false,
            cookieString = '';

        // grab only the data we need
        user = copyBIfInA(user, userData);

        // if api data, store as cookie
        if (!user.is_cookie) {
            // add flag and package up together with time
            user.is_cookie = true;
            userCookie = {
                'data' : user,
                'time' : new Date()
            };
            // store
            storeResponse = cookieJar.set(user.login, userCookie);
            if (storeResponse) {
                console.log('request done, storing cookie: {0}'.format(user.login));
            } else {
                console.log('TROUBLE storing cookie: {0}'.format(user.login));
            }
        }

        // get the repos
        $.when(getRepos(userData.login)).done(function (reposData) {
            var reposCookie = null,
                getJsonArray = [],
                langHash = {},
                statsHash = {},
                storeResponse = false,
                repos_url = [API_URL, 'users', username, 'repos'].join('/') + token,
                cookieString = '',
                r = 0;

            // loop thru the repos
            reposData.forEach(function (repoData, i) {
                // grab only the data we need
                repos.push(copyBIfInA(repo, repoData));
            });

            // if api data, store as cookie
            if (!repos[0].is_cookie) {
                // add flag and package up together with time
                for (r = 0; r < repos.length; r += 1) {
                    repos[r].is_cookie = true;
                }
                reposCookie = {
                    'data' : repos,
                    'time' : new Date()
                };
                console.log(reposCookie);
                // store
                storeResponse = cookieJar.set(repos_url, reposCookie);
                if (storeResponse) {
                    console.log('request done, storing cookie: {0}'.format(repos_url));
                    console.log(cookieString.length);
                    console.log(cookieString);
                } else {
                    console.log('TROUBLE storing cookie: {0}'.format(repos_url));
                    console.log(cookieString.length);
                    console.log(cookieString);
                }
            }

            function getRepoLangs(languagesUrl, index) {
                api_calls += 1;
                console.log('({0}) making request: {1}'.format(api_calls, languagesUrl));
                return $.getJSON(languagesUrl, function (language) {
                    langHash[index] = language;
                });
            }
            function getRepoStats(statUrl, index, stat) {
                api_calls += 1;
                console.log('({0}) making request: {1}'.format(api_calls, statUrl));
                return $.getJSON(statUrl, function (stats) {
                    statsHash[index][stat] = stats;
                });
            }

            user.repos = [];
            // loop thru the repos
            repos.forEach(function (repoData, i) {
                var key = '',
                    repo_url = [API_URL, 'repos', username, repoData.name].join('/');

                // add the repo to the user
                user.repos[i] = repoData;

                //get the languages and stats
                getJsonArray.push(getRepoLangs([repo_url, 'languages'].join('/') + token, i));
                REPO_STATS_URLS.forEach(function (stat) {
                    statsHash[i] = {};
                    getJsonArray.push(getRepoStats([repo_url, 'stats', stat].join('/') + token, i, stat));
                });

            });

            // wait until all the json requests are done
            $.when.apply($, getJsonArray).done(function (response) {
                console.log('languages and stats request done');
                var index,
                    stat;
                // add languages to repos
                for (index in langHash) {
                    if (langHash.hasOwnProperty(index)) {
                        user.repos[index].languages = langHash[index];
                    }
                }
                // add stats to repos
                for (index in statsHash) {
                    if (statsHash.hasOwnProperty(index)) {
                        user.repos[index].stats = {};
                        for (stat in statsHash[index]) {
                            if (statsHash[index].hasOwnProperty(stat)) {
                                user.repos[index].stats[stat] = statsHash[index][stat];
                            }
                        }
                    }
                }
            }).fail(function (response) {
                console.log('languages or stats request failed');

            }).always(function (response) {
                console.log('all requests done!');
                cookieJar.cookies().forEach(function (name) {
                    var cookie = cookieJar.get(name);
                    console.log('    {0}: {1}'.format(name, cookie));
                });
                console.log('');
                // ALL DONE!
                return callback(user, '');
            });
        }).fail(function (response) {
            console.log('repos request failed');
            callback(user, response);
        });
    }).fail(function (response) {
        console.log('user request failed');
        callback(user, response);
    });
}