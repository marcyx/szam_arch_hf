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
    //Set the username to admin and password to 1234
    if (post.user === 'admin' && post.password === '1234') {
        req.session.loggedIn = true;
        res.redirect('/surveys');

    //All other username - password are checked from MySQL database
    } else {
        req.session.loggedIn = false;

        models.sequelize.query('SELECT uid, password FROM users WHERE username = ?', {
                replacements: [post.user],
                type: models.sequelize.QueryTypes.SELECT
            }).then(function(query_result) {

            //console.log(query_result);
            //console.log(query_result[0]['password']);

            //Set uid for current session
            current_uid = query_result[0]['uid'];

            if (post.password === query_result[0]['password']) {
                req.session.loggedIn = true;
                res.redirect('/surveys');
            }
            else
                req.session.loggedIn = false;
                res.send('Bad Password');
        });
    }
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

//Save new survey into mysql database
router.post('/add-survey', checkAuth, function(req, res, next) {
    models.Survey.create( {
        Uid: current_uid,
        title: req.body.survey_title,
        published: true
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


/*
----------------------------------------------------------------------
*/

/*
//Get the questions for the homepage
router.get('/', function(req, res) {
            //Select a question from the database randomly
            models.sequelize.query('SELECT id FROM Questions WHERE id NOT IN(SELECT QuestionId AS id FROM QuestionGuests WHERE GuestId = ?) ORDER BY RAND() LIMIT 1', {
                replacements: [guest.id],
                type: models.sequelize.QueryTypes.SELECT
            })

                .then(function(questions) {
                    if (questions.length <= 0) {
                        //Answered all the questions, redirect to a page with no more questions
                        res.render('empty');
                    }else{
                        models.Question.findById(questions.pop().id)
                            .then(function(question) {
                                question.getChoices().then(function(associatedChoices) {
                                    res.render('index', {
                                        question: question,
                                        choices: associatedChoices,
                                        guest: guest,
                                        title: question.question
                                    });
                                });
                            });
                    }
                });
});


//Save response and question Id to the guest model
router.post('/', function(req, res) {
    models.QuestionGuest.create( {
        QuestionId: req.body.question_id,
        GuestId: req.body.guest_id,
        ChoiceId: req.body.choice_id
    })

        .then(function(result) {
            res.redirect('/');
        });
});

//Get the results for the question with specific ID
router.get('/questions/:id/results', checkAuth, function(req, res, next) {
    models.Question.findById(req.params.id)
        .then(function(question) {
            if ( ! question){
                res.status(500).send('Cannot find question');
            }

            models.sequelize.query('select c.content, count(guest.GuestId) as totalVotes from Choices c left join QuestionGuests guest on c.id = guest.ChoiceId where c.QuestionId = ? group by c.id order by totalVotes desc', {
                replacements: [question.id],
                type: models.sequelize.QueryTypes.SELECT
            })

                .then(function(choices) {
                    res.render('results', {
                        question:question,
                        choices: choices
                    });
                });
        })

        .catch(function(error) {
            console.error(err);
            res.status(500).send('There was an error');
        });
});

//Save question text into mysql database
router.post('/add-question', checkAuth, function(req, res, next) {
    models.Question.create( {
        question: req.body.question
    })

        .then(function(question) {
            res.redirect('/questions/'+question.id);
        })
        .catch(function(error) {
            console.error(error);
            res.status(500).send('There was an error');
        });
});

//Get the specific question page
router.get('/questions/:id', checkAuth, function(req, res, next) {
    models.Question.findById(req.params.id, {
        include: [{
            model: models.Choice
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

//Get all questions for the Manage Questions page
router.get('/questions', checkAuth, function(req, res, next) {
    models.Question.findAndCountAll( {
        order: 'id desc'
    })

        .then(function(result) {
            var total = result.count;
            res.render('questions', {
                questions: result.rows
            });
        });
});

//Save response text into mysql database
router.post('/questions/:id/choices/add', checkAuth, function(req, res, next) {
    models.Choice.create( {
        content: req.body.choice,
        QuestionId: req.params.id
    })

        .then(function() {
            res.redirect('/questions/' + req.params.id);
        });
});

//Update question text in edit question
router.post('/questions/:id', function(req, res, next) {
    models.Question.findById(req.params.id)
        .then(function(question) {
            question.set({
                question: req.body.question
            })
                .save()
                .then(function(question) {
                    req.flash('success', 'updated');
                    res.redirect('/questions/' + question.id);
                });
        });
});

//Delete a question on the questions page
router.get('/questions/:id/delete', function(req, res, next) {
    models.Question.destroy({
        where: {
            id: req.params.id
        }
    })
        .then(function(question) {
            res.redirect('/questions');
        });
});

//Update response text in edit question
router.post('/questions/:id/choices/:choiceId', checkAuth, function(req, res, next) {
    models.Choice.findById(req.params.choiceId)
        .then(function(content) {
            content.set({
                content: req.body.choice
            })
                .save()
                .then(function(content) {
                    req.flash('success', 'updated');
                    res.redirect('/questions/' + req.params.id);
                });
        });
});

//Delete a response in edit question
router.get('/questions/:id/choices/:choiceId/delete', checkAuth, function(req, res, next) {
    models.Choice.destroy({
        where: {
            id: req.params.choiceId
        }
    })
        .then(function() {
            res.redirect('/questions/' + req.params.id);
        });
});

*/

module.exports = router;