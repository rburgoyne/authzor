# Authzor #

Ryan Burgoyne

GECO, Inc.

Authzor is a web interface for managing user-specific authorization for Subversion repositories. Normally these permissions are managed using a text file named 'authz'. With Authzor, it is easy to manage permissions using a graphical interface. Authozor also imports users and groups from LDAP so that you don't have to manually define them.

![Sample screenshot](screenshot.png)

## Installation ##

Install prerequisites apache2, git, python-ldap:

    sudo apt-get install apache2 git python-ldap

Change directory to your web root (on Ubuntu with apache2, /var/www)

    sudo git clone git://github.com/rburgoyne/authzor.git
    sudo chown -R www-data:www-data authzor

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
Make sure that your authz file is writeable by the web user.

## Configuration ##

At the top left corner of the rules table in the Authzor interface, click the "Settings" button to pull up the settings pane. Configure settings as needed:

| Setting                  | Example                  | Meaning            |
| ------------------------ | ------------------------ | ------------------ |
| SVN root directory       | /srv/svn                 |  Where are your Subversion repositories located? |
| Authorization file       | /srv/svn/authz           | Where is your authz permission file? |
| LDAP server URL:         | ldap://ldap.example.com  | URL of the LDAP server from which to pull user and group information |
| Base DN:                 | dc=example,dc=com        | The LDAP base DN from which to start searching for users and groups |
| Users prefix:            | ou=people                | Prefix for LDAP subtree containing users |
|Users filter              | objectclass=posixaccount | Only show users that match the filter
| Users name attribute:    | uid                      | The LDAP attribute to use for usernames |
| Groups prefix            | ou=group                 | Prefix for LDAP subtree containing groups |
| Groups filter            | objectclass=posixgroup   | Only show groups that match the filter |
| Groups name attribute    | cn                       | The LDAP attribute to use for group name |
| Group of SVN groups DN   | cn=svngroups,ou=group,dc=example,dc=com | The DN of the group which contains all other SVN groups. This is used so that not every LDAP group is listed in Authzor |
| Group member attribute   | member                   | Which attribute of a group contains the DN of its members? |
| Group member name attribute | memberuid             | Which attribute of a group contains the uid of its members? |  

## Change Log ##

### 2012-10-18 v0.5b ###

This is the initial release. All features are included, but error handling is not complete.
