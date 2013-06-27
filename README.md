# Authzor #

Ryan Burgoyne

GECO, Inc.

Authzor is a web interface for managing user-specific authorization for Subversion repositories. Normally these permissions are managed using a text file named 'authz'. With Authzor, it is easy to manage permissions using a graphical interface. Authzor also imports users and groups from LDAP so that you don't have to manually define them..

This utility is useful for anyone who has to manage access to Subversion repositories. It was motivated by a desire for that process to be easier and rely on an existing LDAP database instead of a standalone text file.

By default, anyone who can access the application can change its settings. However, if non-technical users will be using the application, the setting "show_settings" in the authzor.conf file should be set to false.

![Sample screenshot](screenshot.png)

## Features ##

  * Create, edit, and delete Subversion authorization rules using a simple web-based interface.
  * Copy rules from one user or group to another or from one location to another. This lets you create a new user and easily say "give her permissions like Sarah" or create a new repository and say "let all the people who can access our production repository access this one too."
  * Group definitions and usernames are imported from an LDAP database.

## Installation ##

Install prerequisites apache2, git, python-ldap:

    sudo apt-get install apache2 git python-ldap python-svn

Clone the repository:

    sudo git clone git://github.com/rburgoyne/authzor.git

If you are using apache, copy all files to your webroot:

    sudo cp -r authzor /var/www

Set permissions so the web user can read all files and write to authzor.conf.

Edit your apache configuration to allow cgi scripts to execute in the cgi-bin
directory. For example, add the following to 
/etc/apache2/sites-enabled/000-default:

    <Directory /var/www/authzor/cgi-bin>
	    Options +ExecCGI
        SetHandler cgi-script
    </Directory>

Add the following section as well, if you want to enable group-based LDAP 
authentication and authorization to access the page, changing the example 
values and group name to match your setup:

    <Directory /var/www/authzor>
            AuthType Basic
            AuthName "Enter administrative credentials"
            AuthBasicProvider ldap
            AuthzLDAPAuthoritative off
            AuthLDAPURL ldap://ldap.example.com:389/dc=example,dc=com
            Require ldap-group cn=admin, ou=group, dc=example, dc=com
    </Directory>

    sudo a2enmod authnz_ldap
    sudo service apache2 restart

The page will now be available at http://[hostname]/authzor

## Configuration ##

At the top left corner of the rules table in the Authzor interface, click the "Settings" button to pull up the settings pane. Configure settings as needed:

| Setting                  | Example                  | Meaning            |
| ------------------------ | ------------------------ | ------------------ |
| SVN root directory       | /srv/svn                 |  Where are your Subversion repositories located? |
| Authorization file       | /srv/svn/authz           | Where is your authz permission file? (Make sure the web user can write to this file.) |
| LDAP server URL          | ldap://ldap.example.com  | URL of the LDAP server from which to pull user and group information |
| Base DN                  | dc=example,dc=com        | The LDAP base DN from which to start searching for users and groups |
| Users prefix             | ou=people                | Prefix for LDAP subtree containing users |
| Users filter             | objectclass=posixaccount | Only show users that match the filter |
| Users name attribute:    | uid                      | The LDAP attribute to use for usernames |
| Groups prefix            | ou=svngroups,ou=group    | Prefix for LDAP subtree containing groups |
| Groups filter            | objectclass=groupofnames | Only show groups that match the filter |
| Groups name attribute    | cn                       | The LDAP attribute to use for group name |
| Groups member attribute  | member                   | The LDAP attribute to use for group membership |

## Package Contents ##

This package contains the following files and directories:

  * authzor
      * cgi-bin: contains original Authzor server-side Python scripts
          * browse_path: returns the children of a given SVN path so a browse tree can be populated
          * get_options: returns a list of users and groups from LDAP
          * get_repos: returns a list of SVN repositories
          * get_rules: returns the `authz` file in JSON format
          * get_settings: returns the configuration from the `authzor.conf` file
          * set_rules: writes new rule set to the `authz` file
          * set_settings: writes new configuration to the `authzor.conf` file
          * shared.py: functions for reading configuration and printing errors shared by all scripts
          * validate_path: verifies that a given SVN path exists
      * images: contains original images and images from glyphicons.com used for the user interface
      * scripts: contains original script and freely available JavaScript libraries
          * themes: contains themes for the jstree library
          * authzor.js: original script which implements the core functionality of the application
          * jquery.js: library for adding advanced JavaScript functionality -- v. 1.7.2 -- jquery.org
          * jquery.jstree.js: library to create browseable file tree -- v. 1.0-rc3 -- jstree.com
      * styles: contains original css file
          * authzor.css: style sheet for Authzor
      * authzor.conf: configuration file written in JSON format
      * index.html: HTML file for Authzor
      * README.md: this file, written in Markdown format

## Development ##

This code is validated using the following tools:

  * W3C validator for the HTML file; "Clean up Markup with HTML-Tidy option should be used -- validator.w3.org/check
  * JSLint for authzor.js; use options: `/*jslint plusplus: true, unparam: true, indent: 4, maxlen: 80 */` -- jslint.com
  * PyLint and PEP8 for Python files

After changes are made, validation should be done again.

## Change Log ##

### 2013-05-01 v1.0 ###

All known issues have been resolved. This is the first production release.

### 2012-10-18 v0.5b ###

This is the initial release. All features are included, but error handling is not complete.
