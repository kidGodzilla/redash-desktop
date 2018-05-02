const { app, ipcRenderer, remote, shell } = require('electron');
const { exec } = require('child_process');
// const prompt = require('electron-prompt');
const fixPath = require('fix-path');
const os = require('os').platform();
// const fs = require('graceful-fs');
fixPath();

// Give us f12 and f5 to load devTools and Reload (Do this early in case something else spawns an error)
document.addEventListener("keydown", function (e) {
    if (e.which === 123) {
        window.toggleDevTools();
    } else if (e.which === 116) {
        location.reload();
    }
});

let userPath = '~';

function installBrew (cb) {
	console.log('Checking for BREW');

	exec(`brew`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('command not found') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Installing Brew');

			exec(`/usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"`, (err, stdout, stderr) => {
				console.log('Installed BREW', stdout);
			});
		}

		if (cb && typeof cb === 'function') cb();
	});
}


function installPostgres (cb) {
	console.log('Checking for Postgres');

	exec(`psql --version`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('command not found') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Installing Postgres');

			exec(`brew install postgresql`, (err, stdout, stderr) => {
				console.log('Installed Postgres', stdout);
			});
		}

		if (cb && typeof cb === 'function') cb();
	});
}

function installRedis (cb) {
	console.log('Checking for Redis');

	exec(`redis-cli --version`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('command not found') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Installing Redis');

			exec(`brew install redis`, (err, stdout, stderr) => {
				console.log('Installed Redis', stdout);
			});
		}

		if (cb && typeof cb === 'function') cb();
	});
}

function installPython (cb) {
	console.log('Checking for Python');

	exec(`python --version`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('command not found') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Installing Python 2');

			exec(`brew install python@2`, (err, stdout, stderr) => {
				console.log('Installed Python', stdout);
			});
		}

		if (cb && typeof cb === 'function') cb();
	});
}


function installPip (cb) {
	console.log('Checking for Pip');

	exec(`pip --version`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('command not found') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Installing PIP');

			exec(`sudo easy_install pip`, (err, stdout, stderr) => {
				console.log('Installed Pip', stdout);
			});
		}

		if (cb && typeof cb === 'function') cb();
	});
}


function brewUpdate (cb) {
	exec(`brew update`, (err, stdout, stderr) => {
        if (stderr) console.log('stderr', stderr);

        console.log('Updated Brew', stdout);
	});

	if (cb && typeof cb === 'function') cb();
}


function pipInstall (cb) {
    $('h5').html('Installing Redash');

	exec(`cd ${userPath} && cd redash-master && pip install -r requirements.txt -r requirements_dev.txt`, (err, stdout, stderr) => {
		if (stderr) console.log('stderr', stderr);

		console.log('Reinstalled pip requirements', stdout);
	});

	if (cb && typeof cb === 'function') cb();
}


function npmInstall (cb) {
	exec(`cd ${userPath} && cd redash-master && npm install && npm run build`, (err, stdout, stderr) => {
        if (stderr) console.log('stderr', stderr);

        console.log('Reinstalled npm packages', stdout);
	});

	if (cb && typeof cb === 'function') cb();
}


function initialSetup (cb) {
	$('h5').html('Bootstrapping Database');

	exec(`cd ${userPath} && cd redash-master && bin/run ./manage.py check_settings && bin/run ./manage.py database create_tables`, (err, stdout, stderr) => {
		console.log('Initial Settings setup and database bootstrap', stdout);
	});

	if (cb && typeof cb === 'function') cb();
}

function installNode (cb) {
	$('h5').html('Installing Node.js via NVM');

	exec(`cd ${userPath} && brew install nvm && source $(brew --prefix nvm)/nvm.sh && echo "source $(brew --prefix nvm)/nvm.sh" >> ~/.profile && mkdir ~/.nvm && nvm install node && nvm use node`, (err, stdout, stderr) => {
		console.log('Installed NVM, Node, and NPM', stdout);
	});

	if (cb && typeof cb === 'function') cb();
}


function checkNPM (cb) {
	console.log('checking for NPM');

	exec('npm -v', (err, stdout, stderr) => {
		if (stderr) installNode(function () {
			if (cb && typeof cb === 'function') cb();
		})
	});
}

function checkNode (cb) {
	console.log('checking for node');

	exec('node -v', (err, stdout, stderr) => {
		if (stderr) installNode(function () {
			if (cb && typeof cb === 'function') cb();
		});
	});
}

function downloadRedash (cb) {
	console.log('Checking for Redash');

	exec(`cd ${userPath} && cd redash-master`, (err, stdout, stderr) => {
		if (!!stderr && stderr.indexOf('such file or directory') !== -1) {
			console.log('stderr', stderr);

			$('h5').html('Downloading Redash');

			exec(`cd ${userPath} && curl https://github.com/getredash/redash/archive/master.zip -L -o redash-master.zip && unzip redash-master.zip`, (err, stdout, stderr) => {
				console.log(stdout, stderr);

				pipInstall(function () {
					checkNode(function () {
						checkNPM(function () {
							npmInstall(function () {
								initialSetup(function () {
									if (cb && typeof cb === 'function') cb();
								})
							})
						})
					})
				})
			});
		} else {
			if (cb && typeof cb === 'function') cb();
		}
	});
}



function startRedash (cb) {
	exec('cd '+userPath+'/redash-master/ && source env/bin/activate && bin/run ./manage.py runserver --debugger --reload', (err, stdout, stderr) => {
		if (stderr) console.log(stderr);
		if (stdout) console.log(stderr);
	});


	exec('cd '+userPath+'/redash-master/ && source env/bin/activate && bin/run celery worker --app=redash.worker --beat -Qscheduled_queries,queries,celery -c2', (err, stdout, stderr) => {
		if (stderr) console.log(stderr);
		if (stdout) console.log(stderr);
	});


	exec('cd '+userPath+'/redash-master/ && npm run start', (err, stdout, stderr) => {
		if (stderr) console.log(stderr);
		if (stdout) console.log(stderr);
	});

	if (cb && typeof cb === 'function') cb();
}


// Get our user's path & stash it for later (fs cannot reliably use ~)
exec('cd ~ && pwd', (err, stdout, stderr) => {
	if (stdout) userPath = stdout.trim().replace('\n', '');

	console.log('Userpath:', userPath)


// https://redash.io/help/open-source/dev-guide/setup

// Installing Dependencies
// PostgreSQL & Redis
// Refer to the documentation of Python (2.7), PostgreSQL (9.3 or newer), Redis (2.8.3 or newer) and Node.js (v6 or newer) on how to install them in your environment. On macOS, you can use brew to install them. On Linux you can use your package manager, although need to make sure it installs recent enough versions.
//
// 	Python Packages
// For development the minimum required packages to install are described in:
//
// requirements.txt
// requirements_dev.txt
// You install them with pip:
//
// pip install -r requirements.txt -r requirements_dev.txt
// (We recommend installing them in a virtualenv. For using some data source types, you need to install additional dependencies from requirements_all_ds.txt.)
//
// Node.js Packages
// Install all packages with:
//
// npm install
// First time build assets:
//
// 	npm run build
// Configuration
// For development, in most cases the default configuration is enough. But if you need to adjust the database configuration, mail settings or any other setting, you do so with environment variables.
//
// 	To avoid having to export those variables manually, you can use a .env file and the bin/run helper script. By invoking any command with bin/run prefix, it will load your environment variables from the .env file and then run your command. For example:
//
// 	bin/run ./manage.py check_settings
// Creating Database Tables
// bin/run ./manage.py database create_tables


// git clone redash-master to ~/redash-master/

// brew update
// brew install postgresql
// brew install redis
// brew install python@2
// pip install -r requirements.txt -r requirements_dev.txt
// npm install && npm run build
// bin/run ./manage.py check_settings && bin/run ./manage.py database create_tables


	// Check for all of the things
	installBrew(function () {
		brewUpdate(function () {
			installPostgres(function () {
				installRedis(function () {
					installPython(function () {
						installPip(function () {
							downloadRedash(function () {
								$('h5').html('Starting Redash. This may take a moment..');

								startRedash(function () {
									setTimeout(function () {
										$('h5').html('Running on port 5000.');
										// $('h5').append('<p><small>Leave this window open until you are finished with Redash.</small></p>');
										setTimeout(function () {
											shell.openExternal('http://localhost:5000/');
										}, 1000)
									}, 5000)
								})
							})
						})
					})
				})
			})
		})
	});

});
