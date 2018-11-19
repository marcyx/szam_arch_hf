var express = require('express');
var router = express.Router();
var current_uid;
var models = require('../models');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('connect-flash');


//Use this function to check if the user is logged in as an admin
function checkAuth(req, res, next) {
    if (!req.session.loggedIn) {
        res.send('You are not authorized to view this page');
    }else{
        next();
    }
}

//Login authentication
router.post('/login', function(req, res) {
    var post = req.body;
    req.session.loggedIn = false;

    models.sequelize.query('SELECT uid, password FROM users WHERE username = ?', {
            replacements: [post.user],
            type: models.sequelize.QueryTypes.SELECT
    }).then(function(query_result) {

        //console.log(query_result);
        //console.log(query_result[0]['uid']);

        if (query_result.length != 0){
            //Set uid for current session
            current_uid = query_result[0]['uid'];

            if (post.password === query_result[0]['password']){
                req.session.loggedIn = true;
                res.redirect('/surveys');
            }
            else{
                req.session.loggedIn = false;
                res.send('Bad password');
            }
        }
        else{
            req.session.loggedIn = false;
            res.send('Username not existing');
        }
    });
});

//Get the login page
router.get('/login', function(req, res) {
    res.render('login');
});


//Get the logout route
router.get('/logout', function(req, res) {
    req.session.loggedIn = false;
    res.redirect('/login');
});


//Get the surveys for the homepage
router.get('/surveys', checkAuth, function(req, res, next) {
    models.Survey.findAndCountAll( {
        where: {Uid: current_uid},
        order: 'Sid desc'
    }).then(function(query_result) {
            var total = query_result.count;
            res.render('surveys', {
                    surveys: query_result.rows
                });
        });
});

//Fill the surveys from all surveys page
router.get('/surveys/survey_fill/:Sid', checkAuth, function(req, res, next) {
        //Select a question depends on Sid
            models.sequelize.query('SELECT Qid FROM questions WHERE questions.Sid='+req.params.Sid+' AND questions.Qid NOT IN(SELECT Qid FROM votes WHERE Uid = ?)', {
                replacements: [current_uid],
                type: models.sequelize.QueryTypes.SELECT
            })

                .then(function(questions) {
                    console.log(questions);
                    if (questions.length <= 0) {
                        //Answered all the questions, redirect to a page with no more questions
                        res.render('empty');
                    }else{
                        models.Question.findOne({ where: {
                                Qid: questions.shift().Qid}
                            })
                            .then(function(question) {
                                question.getAnswers().then(function(associatedAnswers) {
                                    res.render('index', {
                                        question: question.content,
                                        answers: associatedAnswers,
                                        question_id: question.Qid,
                                        survey_id: question.Sid
                                });
                            });
                        });
                    }
                });
});

//Save the answer for each question to table votes
router.post('/save_answer', function(req, res) {
    models.Vote.create( {
        Aid: req.body.answer_id,
        Qid: req.body.q_id,
        Uid: current_uid
    })

        .then(function(result) {
            res.redirect('/surveys/survey_fill/'+req.body.s_id);
        })
        .catch(function(error) {
            console.error(error);
            res.status(500).send('There was an error');
        });
});

//Get the results for the question with specific ID
router.get('/surveys/:Sid/result', checkAuth, function(req, res, next) {
    var allAnswersForAllQuestion = [];
    var questionContent = [];
    var currentSurvey;
    var promise = doAllStuff();
    promise.then(setTimeout(function(renderPage) {
            res.render('results', {
                survey: currentSurvey,
                questions: questionContent,
                answers: allAnswersForAllQuestion
            })
        }, 500)
    );
    function doAllStuff() {
        var promise = new Promise(function(resolve, reject){
        models.sequelize.query('select Qid, content from questions WHERE questions.Sid= ? ', {
                replacements: [req.params.Sid],
                type: models.sequelize.QueryTypes.SELECT
            })
            .then(function(questions) {
                models.Survey.findOne({ where: {
                        Sid: req.params.Sid}
                })
                .then(function(currSurvey) {
                    currentSurvey = currSurvey;
                    for(var i in questions) {
                        var arrayLength=allAnswersForAllQuestion.length;
                        models.Question.findOne({ where: {
                            Qid: questions[i].Qid}
                        })
                        .then(function(question) {
                            questionContent.push(question);
                            models.sequelize.query('select a.content, count(v.Uid) as totalVotes, a.Qid from answers a left join votes v on a.Aid = v.Aid where a.Qid = ? group by a.Aid order by totalVotes desc', {
                                replacements: [question.Qid],
                                type: models.sequelize.QueryTypes.SELECT
                            })
                            .then(function(addToArray) {
                                allAnswersForAllQuestion.push(addToArray);
                                arrayLength = allAnswersForAllQuestion.length;
                                resolve(allAnswersForAllQuestion == questions.length);
                                
                            })
                        })
                    }         
                })
            })
            .catch(function(error) {
                console.error(error);
                res.status(500).send('There was an error');
            })
        });
        return promise;
    }
});

// List all surveys
router.get('/all-surveys', checkAuth, function(req, res, next) {
   models.Survey.findAndCountAll( {
                where: { 
                    Uid: {
                        $ne: current_uid
                    }
                },
                order: 'Sid desc'
            }).then(function(query_result) {
                var total = query_result.count;
                 res.render('surveys_all', {
                    surveys: query_result.rows
                });
            
        });
});

//Save new survey into mysql database
router.post('/add-survey', checkAuth, function(req, res, next) {
    models.Survey.create( {
        Uid: current_uid,
        title: req.body.survey_title,
        published: false
    })
        .then(function(survey) {
            res.redirect('/surveys/'+ survey.Sid);
        })
        .catch(function(error) {
            console.error(error);
            res.status(500).send('There was an error');
        });
});

//Delete survey from mysql database on the homepage
router.get('/surveys/:Sid/delete', function(req, res, next) {
    models.Survey.destroy({
        where: {
            Sid: req.params.Sid
        }
    })
        .then(function(survey) {
            res.redirect('/surveys');
        });
});

//Publish survey from mysql database on the homepage
router.post('/surveys/:Sid/publish', function(req, res, next) {
     models.Survey.findById(req.params.Sid)
        .then(function(survey) {
            survey.set({
                published: true
            })
                .save()
                .then(function(survey) {
                    req.flash('success', 'updated');
                    res.redirect('/surveys');
                });
        });
});

//Get survey text - specific survey id and details
router.get('/surveys/:Sid', checkAuth, function(req, res, next) {
    models.Survey.findById(req.params.Sid, {
        include: [{
            model: models.Question
        }]
    })

        .then(function(survey) {
            if ( ! survey) {
                res.status(500).send('Cannot find question');
            }

            res.render('survey', {
                survey: survey
            });
        });
});


//Update survey text
router.post('/surveys/:Sid', function(req, res, next) {
    models.Survey.findById(req.params.Sid)
        .then(function(survey) {
            survey.set({
                title: req.body.survey
            })
                .save()
                .then(function(survey) {
                    req.flash('success', 'updated');
                    res.redirect('/surveys');
                });
        });
});

//Delete a question from survey - on the survey page
router.get('/surveys/:Sid/questions/:Qid/delete', function(req, res, next) {
    models.Question.destroy({
        where: {
            Qid: req.params.Qid
        }
    })
        .then(function(question) {
            res.redirect('/surveys/' + req.params.Sid);
        });
});


//Add new question to a proper survey - based on survey id
router.post('/surveys/:Sid/questions/add', checkAuth, function(req, res, next) {
    models.Question.create( {
        content: req.body.question,
        Sid: req.params.Sid
    })
        .then(function(result) {
            res.redirect('/surveys/questions/' + result.Qid);
        });
});


//Get question list to a survey - goal is to visualize them
router.get('/surveys/questions/:Qid', checkAuth, function(req, res, next) {
    models.Question.findById(req.params.Qid, {
        include: [{
            model: models.Answer
        }]
    })
        .then(function(question) {
            if ( ! question) {
                res.status(500).send('Cannot find question');
            }

            res.render('question', {
                question: question
            });
        });
});

//Update question on survey view - "CHANGE QUESTION DETAILS"
router.post('/surveys/questions/:Qid', function(req, res, next) {
    models.Question.findById(req.params.Qid)
        .then(function(question) {
            question.set({
                content: req.body.question
            })
                .save()
                .then(function(question) {
                    req.flash('success', 'updated');
                    res.redirect('/surveys/questions/' + req.params.Qid);
                });
        });
});


//Add new answer to a proper question - based on question id
router.post('/surveys/questions/:Qid/answers/add', checkAuth, function(req, res, next) {
    models.Answer.create( {
        content: req.body.answer,
        Qid: req.params.Qid
    })
        .then(function(result) {
            res.redirect('/surveys/questions/' + result.Qid);
        });
});


//Delete an answer from question - on the question page
router.get('/surveys/questions/:Qid/answers/:Aid/delete', function(req, res, next) {
    models.Answer.destroy({
        where: {
            Aid: req.params.Aid
        }
    })
        .then(function(answer) {
            res.redirect('/surveys/questions/' + req.params.Qid);
        });
});


//Update answer content - "CHANGE ANSWER DETAILS"
router.post('/surveys/questions/:Qid/answers/:Aid', function(req, res, next) {
    models.Answer.findById(req.params.Aid)
        .then(function(answer) {
            answer.set({
                content: req.body.answer
            })
                .save()
                .then(function(answer) {
                    req.flash('success', 'updated');
                    res.redirect('/surveys/questions/' + req.params.Qid);
                });
        });
});
module.exports = router;
