(function () {
    "use strict";

    // name_type constants
    var ALL = 'all',
        USER = 'user',
        GROUP = 'group',

        // Permissions constants
        R = 'r',
        RW = 'rw',

        rules, // This is the application state
        users, // These are saved so that the dropdown can be updated
        groups,
        settings,

        checked_count = 0,
        edit = false,
        copy = false,

        Rule,
        createNewRule,

        init,
        getSettings,
        getOptions,
        getRepos,
        getRules,
        clearInputs,
        updateUsersGroups,
        repoChanged,
        editChecked,
        addNewRule,
        hideModal,
        commitChanges,
        setRules,
        showRules,
        showNewRuleForm,
        updatePermissionsCheckboxes,
        deleteCheckedRows,
        fillFormData,
        showModal,
        editSettings,
        setSettings,
        updatePathInputs,
        loadBrowseList,
        getFullPath,
        populateDropdown,
        refreshButtons,
        addRule,
        comparePathThenName,
        compareNameThenPath,
        compareStrings,
        compareAddDeleteStatus,
        getDisplayName,
        displayError;

    $(document).ready(function () {
        // Prevent Ajax caching - always get a new result
        $.ajaxSetup({
            cache: false
        });

        init();

        // Add change event for user/group radio buttons to populate the
        // dropdown appropriately
        $("#rule-form input[name=user-group]").change(updateUsersGroups);

        $("#rule-form select[name=repos]").change(repoChanged);

        $('#ok-button').click(function (event) {
            event.preventDefault();

            var path_valid;
            $.ajax({
                type: 'GET',
                url: 'cgi-bin/validate_path',
                async: false, // Block until validate_path returns so that
                              // the user can't perform other actions until
                              // submission is complete
                data: {
                    'path': 'file://' + settings.svn_root_dir + '/' +
                        $('#repos-dropdown').val() + $('#path-input').val()
                },
                success: function (data) {
                    path_valid = data.valid;
                }
            });
            if (path_valid || $('#repos-dropdown').val() === '/') {
                $('#path-invalid-message').hide();
                if (edit) {
                    editChecked();
                    clearInputs();
                } else {
                    addNewRule();
                }
                hideModal($('#rule-form'));
            } else {
                $('#path-invalid-message').show('fast');
            }
        });

        $('#save-button').click(function (event) {
            event.preventDefault();
            commitChanges();
            setRules();
        });

        $('#button-bar input[name=arrange-by]').change(function () {
            showRules();
        });

        $('#new-button').click(function () {
            showNewRuleForm();
        });

        $('#cancel-button').click(function () {
            clearInputs();
            hideModal($('#rule-form'));
        });

        // Make sure only r or rw can be selected, not write-only
        $('#write-checkbox').click(function () {
            updatePermissionsCheckboxes();
        });

        $('#delete-button').click(function () {
            deleteCheckedRows();
        });

        $('#edit-button').click(function () {
            edit = true;
            fillFormData();
            showModal($('#rule-form'));
        });

        $('#copy-button').click(function () {
            edit = true;
            copy = true;
            fillFormData();
            showModal($('#rule-form'));
        });

        // Set the height of modal forms to be just hidden behind the title
        // bar  
        $('.modal').each(function () {
            $(this).offset({
                top: -($(this).height() + $('#button-bar').height())
            });
        });

        $('#refresh-button').click(function () {
            getOptions();
        });

        $('#revert-button').click(function () {
            rules = undefined;
            getRules();
        });

        // Check multi-edit boxes when changes are made
        $('.input-group input, .input-group select').change(function () {
            $(this).closest('.edit-multiple-group')
                .find('.edit-multiple-checkbox').prop('checked', 'checked');
        });

        $('#settings-button').click(function () {
            getSettings();
            showModal($('#settings-form'));
        });

        $('#settings-cancel-button').click(function () {
            hideModal($('#settings-form'));
        });

        $('#settings-ok-button').click(function (event) {
            event.preventDefault();
            hideModal($('#settings-form'));
            editSettings();
            setSettings();
        });
    });

    showNewRuleForm = function () {
        $('.edit-multiple-checkbox-container').hide();
        $('.input-group').removeClass('edit-multiple');
        $('#ok-button').val('Add Rule');
        showModal($('#rule-form'));
    };

    repoChanged = function () {
        updatePathInputs();
        if ($('#repos-dropdown').val() === '/') {
            $('#browse-list').animate({
                'height': 0
            }, 'fast', function () {
                $(this).hide();
            });
        } else {
            loadBrowseList();
            $('#browse-list').show().animate({
                'height': 150
            }, 'slow');
        }
    };

    init = function () {
        getSettings();
        getOptions();
        getRepos();
        getRules();
        clearInputs();
        $('#browse-list').hide();
    };

    // This is called when a repository is selected
    loadBrowseList = function () {
        if (settings) {
            $('#browse-list').jstree({
                "json_data": {
                    // See http://www.jstree.com/documentation/json_data under
                    // heading "ajax" for more information
                    "ajax": {
                        "url": 'cgi-bin/browse_path',
                        "data": function (path) { // compose the input data for
                                                  // browse_path
                            var pathData;
                            if (path === -1) {
                                pathData = {
                                    'path': 'file://' +
                                        settings.svn_root_dir +
                                        '/' + $('#repos-dropdown').val()
                                };
                            } else {
                                pathData = {
                                    'path': $(path).data('full_path')
                                };
                            }

                            return pathData;
                        }
                    }
                },
                "plugins": ["themes", "json_data", "ui"]
            // bind an event handler to the "select_node"
            }).bind("select_node.jstree", function (event, data) {
                // jstree event
                var rel_path = data.rslt.obj.data('full_path')
                    .replace('file://' + settings.svn_root_dir + '/', '');
                rel_path = rel_path.substring(rel_path.indexOf('/'),
                    rel_path.length);
                $('#path-input').val(rel_path).change();
            });
        }
    };

    updatePathInputs = function () {
        // If no repository is selected, path selection is disabled
        if ($("#rule-form select[name=repos]").val() === '/') {
            $("#rule-form input[name=path]").val('');
            $("#rule-form input[name=path]").attr('disabled', 'disabled');
            $("#rule-form input[name=browse]").attr('disabled', 'disabled');
        } else {
            $("#rule-form input[name=path]").removeAttr('disabled');
            $("#rule-form input[name=browse]").removeAttr('disabled');
        }
    };

    editSettings = function () {
        settings.svn_root_dir = $('#svn-root-dir-input').val().replace(/\/$/,
            "");
        settings.authz_file = $('#authz-file-input').val();
        settings.admin_email = $('#admin-email-input').val();
        settings.ldap_server_url = $('#ldap-server-url-input').val();
        settings.base_dn = $('#base-dn-input').val();
        settings.users_prefix = $('#users-prefix-input').val();
        settings.users_filter = $('#users-filter-input').val();
        settings.users_name_attr = $('#users-name-attr-input').val();
        settings.groups_prefix = $('#groups-prefix-input').val();
        settings.groups_filter = $('#groups-filter-input').val();
        settings.groups_name_attr = $('#groups-name-attr-input').val();
        settings.group_member_attr = $('#group-member-attr-input').val();
    };

    setSettings = function () {
        $.ajax({
            url: 'cgi-bin/set_settings',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(settings),
            complete: function () {
                init();
            }
        });
    };

    getSettings = function () {
        $.ajax({
            url: 'cgi-bin/get_settings',
            type: 'GET',
            contentType: 'application/json',
            success: function (new_settings) {
                if (new_settings.error) {
                    displayError(new_settings.error);
                } else {
                    settings = new_settings;
                    if (settings !== null) {
                        if (settings.show_settings) {
                            $('#settings-button').show();
                        } else {
                            $('#settings-button').hide();
                        }
                        $('#svn-root-dir-input').val(settings.svn_root_dir);
                        $('#authz-file-input').val(settings.authz_file);
			$('#admin-email-input').val(settings.admin_email);
                        $('#ldap-server-url-input')
                            .val(settings.ldap_server_url);
                        $('#base-dn-input').val(settings.base_dn);
                        $('#users-prefix-input').val(settings.users_prefix);
                        $('#users-filter-input').val(settings.users_filter);
                        $('#users-name-attr-input')
                            .val(settings.users_name_attr);
                        $('#groups-prefix-input').val(settings.groups_prefix);
                        $('#groups-filter-input').val(settings.groups_filter);
                        $('#groups-name-attr-input')
                            .val(settings.groups_name_attr);
                        $('#group-member-attr-input')
                            .val(settings.group_member_attr);
                    }
                }
            }
        });
    };

    fillFormData = function () {
        // Loop through all checked rules and populate edit fields with values
        // that are common among all of them. All other edit fields are blanked
        // out.

        var edit_rule, edit_count = 0;
        $('#rules-table tr:not(.header-row)').each(function (index, row) {
            if ($(row).find(':checkbox').is(':checked')) {
                edit_count += 1;
                if (!edit_rule) {
                    edit_rule = jQuery.extend({}, rules[index]);
                } else {
                    if (getFullPath(edit_rule) !== getFullPath(rules[index])) {
                        edit_rule.repo = '';
                        edit_rule.path = '';
                    }
                    if (!((edit_rule.name_type === rules[index].name_type)
                        && (edit_rule.name === rules[index].name))) {
                        edit_rule.name_type = '';
                        edit_rule.name = '';
                    }
                    if (edit_rule.permissions !== rules[index].permissions) {
                        edit_rule.permissions = '';
                    }
                }
            }
        });

        $('#repos-dropdown').val(edit_rule.repo);
        $('#path-input').val(edit_rule.path);
        repoChanged();
        // By default, pick "All"
        $('#all-radio-button').prop('checked', 'checked');
        $('#user-radio-button').prop('checked', (edit_rule.name_type === USER));
        $('#group-radio-button').prop('checked', (edit_rule.name_type ===
            GROUP));
        updateUsersGroups();
        $('#users-groups-dropdown').val(edit_rule.name);
        $('#read-checkbox').prop('checked', (edit_rule.permissions === R ||
            edit_rule.permissions === RW));
        $('#write-checkbox').prop('checked', (edit_rule.permissions === RW));
        updatePermissionsCheckboxes();

        // If multiple rules are checked, show the multi-edit interface
        if (edit_count > 1) {
            $('.edit-multiple-checkbox-container').show();
            $('.input-group').addClass('edit-multiple');
            if (copy) {
                $('#ok-button').val('Copy Rules');
            } else {
                $('#ok-button').val('Change Rules');
            }
        } else {
            $('.edit-multiple-checkbox-container').hide();
            $('.input-group').removeClass('edit-multiple');
            if (copy) {
                $('#ok-button').val('Copy Rule');
            } else {
                $('#ok-button').val('Change Rule');
            }
        }
    };

    updateUsersGroups = function () {
        if ($("#user-radio-button").is(":checked")) {
            populateDropdown("#users-groups-dropdown", users);
            $("#users-groups-dropdown").removeAttr("disabled");
        } else if ($("#group-radio-button").is(":checked")) {
            populateDropdown("#users-groups-dropdown", groups);
            $("#users-groups-dropdown").removeAttr("disabled");
        } else {
            populateDropdown("#users-groups-dropdown", []);
            $("#users-groups-dropdown").attr("disabled", "disabled");
        }
    };

    updatePermissionsCheckboxes = function () {
        // Make sure only r or rw can be selected, not write-only
        if ($('#write-checkbox').is(':checked')) {
            $('#read-checkbox').attr('checked', 'checked').attr('disabled',
                'disabled');
        } else {
            $('#read-checkbox').removeAttr('disabled');
        }
    };

    showModal = function (modal_form) {
        $('#button-bar input').attr("disabled", "disabled");
        $('#footer input').attr("disabled", "disabled");
        $(modal_form).show().animate({
            top: $('#button-bar').height()
        }, 'slow');
        $('#cover').show().animate({
            opacity: 0.4
        }, 'slow');
    };

    hideModal = function (modal_form) {
        $(modal_form).animate({
            top: -($(modal_form).height() +
                $('#button-bar').height())
        }, 'slow', function () {
            $(this).hide();
        });
        $('#cover').animate({
            opacity: 0
        }, 'slow', function () {
            $(this).hide();
        });

        // Uncheck all boxes
        $('#rules-table :checkbox:checked').prop('checked', false);
        checked_count = 0;
        edit = false;
        copy = false;
        refreshButtons();

        $('#button-bar input').removeAttr("disabled");
        $('#footer input').removeAttr("disabled");
    };

    clearInputs = function () {
        $('#repos-dropdown').val('');
        repoChanged();
        $('#path-input').val('');
        $('#all-radio-button').prop('checked', 'checked');
        $('#user-radio-button').prop('checked', '');
        $('#group-radio-button').prop('checked', '');
        updateUsersGroups();
        $('#read-checkbox').prop('checked', '');
        $('#write-checkbox').prop('checked', '');
        updatePermissionsCheckboxes();
        $('.edit-multiple-checkbox').prop('checked', '');
        $('#path-invalid-message').hide();
    };

    getOptions = function () {
        $.get("cgi-bin/get_options", function (options) {
            if (options.error) {
                users = [];
                groups = [];
                displayError(options.error);
            } else {
                users = options.users;
                groups = options.groups;
                updateUsersGroups();
            }
        });
    };

    getRepos = function () {
        $.get("cgi-bin/get_repos", function (repos) {
            if (repos.error) {
                displayError(repos.error);
            } else {
                populateDropdown("#repos-dropdown", repos);
                $('#repos-dropdown').prepend($('<option>', {
                    value: '/',
                    text: '/'
                }));
                updatePathInputs();
            }
        });
    };

    populateDropdown = function (dropdown, list) {
        $(dropdown).find('option').remove();
        $.each(list, function (index, value) {
            $(dropdown).append($('<option>', {
                value: value,
                text: value
            }));
        });
    };

    commitChanges = function () {
        // Apply pending changes to the "rules" array
        // (prior to applying it to the real authz)
        var i, rows = $('#rules-table tr:not(.header-row)').get();
        for (i = rows.length - 1; i >= 0; i--) {
            if (rules[i].deleted) {
                rules.splice(i, 1);
            }
        }
    };

    getRules = function () {
        $.ajax({
            url: 'cgi-bin/get_rules',
            type: 'GET',
            contentType: 'application/json',
            success: function (new_rules) {
                if (new_rules.error) {
                    displayError(new_rules.error);
                } else {
                    rules = new_rules;
                    showRules();
                }
            }
        });
    };

    setRules = function () {
        $.ajax({
            url: 'cgi-bin/set_rules',
            type: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(rules),
            complete: function () {
                init();
            }
        });
    };

    Rule = function (repo, path, name_type, name, permissions) {
        this.repo = repo;
        this.path = path;
        this.name_type = name_type;
        this.name = name;
        this.permissions = permissions;
    };

    // Creates a new rule from the dialog inputs

    createNewRule = function () {
        var repo, path, name_type, name, permissions, newRule;
        repo = $('#repos-dropdown').val();
        if ($('#path-input').val() === '') {
            path = '/';
        } else {
            path = $('#path-input').val();
        }
        name_type = $('input[name="user-group"]:checked').val();
        if ($('input[name="user-group"]:checked').val() === 'all') {
            name = '';
        } else {
            name = $('#users-groups-dropdown').val();
        }
        if ($('#write-checkbox').is(':checked')) {
            permissions = RW;
        } else if ($('#read-checkbox').is(':checked')) {
            permissions = R;
        } else {
            permissions = null;
        }

        newRule = new Rule(repo, path, name_type, name, permissions);

        return newRule;
    };

    // Executes when the "Add Rule" button is pressed -
    // creates a new rule and adds, then re-shows the table.
    addNewRule = function () {
        var newRule = createNewRule();
        addRule(newRule);

        showRules();
    };

    // Gives a rule the "added" property and pushes it to the list of rules.
    addRule = function (rule) {
        rule.added = true;
        rules.push(rule);
    };

    editChecked = function () {
        var edit_path = true, edit_name = true, edit_permissions = true,
            newRule, rows, i, editedRule;

        // If editing multiple rules, 
        if ($('#rules-table tr:not(.header-row) :checkbox:checked')
                .length > 1
                ) {
            edit_path = $('#path-edit-multiple-checkbox').is(
                ':checked'
            );
            edit_name = $('#name-edit-multiple-checkbox').is(
                ':checked'
            );
            edit_permissions = $(
                '#permissions-edit-multiple-checkbox'
            ).is(':checked');
        }

        newRule = createNewRule();

        // Loop through all checked rows
        rows = $('#rules-table tr:not(.header-row)').get();
        for (i = rows.length - 1; i >= 0; i--) {
            if ($(rows[i]).find(':checkbox').is(':checked')) {
                editedRule = jQuery.extend({}, newRule);
                if (!edit_path) {
                    editedRule.repo = rules[i].repo;
                    editedRule.path = rules[i].path;
                }
                if (!edit_name) {
                    editedRule.name_type = rules[i].name_type;
                    editedRule.name = rules[i].name;
                }
                if (!edit_permissions) {
                    editedRule.permissions = rules[i].permissions;
                }

                addRule(editedRule);
                if (!copy) {
                    rules[i].deleted = true;
                }
            }
        }

        showRules();
    };

    deleteCheckedRows = function () {
        var i, rows = $('#rules-table tr:not(.header-row)').get();
        for (i = rows.length - 1; i >= 0; i--) {
            if ($(rows[i]).find(':checkbox').is(':checked')) {
                rules[i].deleted = true;
            }
        }
        showRules();
    };

    comparePathThenName = function (rule_a, rule_b) {
        var path_difference, name_difference;
        path_difference = compareStrings(getFullPath(rule_a), getFullPath(
            rule_b
        ));
        if (path_difference !== 0) {
            return path_difference;
        }
        name_difference = compareStrings(rule_a.name, rule_b.name);
        if (name_difference !== 0) {
            return name_difference;
        }
        return compareAddDeleteStatus(rule_a, rule_b);
    };

    compareNameThenPath = function (rule_a, rule_b) {
        var name_difference, path_difference;
        name_difference = compareStrings(rule_a.name, rule_b.name);
        if (name_difference !== 0) {
            return name_difference;
        }
        path_difference = compareStrings(getFullPath(rule_a),
            getFullPath(
                rule_b
            ));
        if (path_difference !== 0) {
            return path_difference;
        }
        return compareAddDeleteStatus(rule_a, rule_b);
    };

    compareStrings = function (string_a, string_b) {
        var lower_a = string_a.toLowerCase(), lower_b = string_b.toLowerCase();
        if (lower_a < lower_b) {
            return -1;
        }
        if (lower_a > lower_b) {
            return 1;
        }
        return 0;
    };

    // Identical rules should appear in the list in the order:
    // normal, deleted, added
    compareAddDeleteStatus = function (rule_a, rule_b) {
        var status_a, status_b;

        if (rule_a.added === true) {
            status_a = 2;
        } else if (rule_a.deleted === true) {
            status_a = 1;
        } else {
            status_a = 0;
        }

        if (rule_b.added === true) {
            status_b = 2;
        } else if (rule_b.deleted === true) {
            status_b = 1;
        } else {
            status_b = 0;
        }

        return status_a - status_b;
    };

    showRules = function () {
        var scroll_here, sections, arrange_by_path, existing_section,
            new_section;
        // Hide the rules section while processing completes
        $('#rules-section').hide().css({
            opacity: 0
        });

        // Empty the rules table
        $('#rules-table tbody').remove();
        checked_count = 0;
        refreshButtons();

        // Sort the rules
        if ($('#arrange-by-path-radio-button').is(':checked')) {
            rules.sort(comparePathThenName);
        } else {
            rules.sort(compareNameThenPath);
        }

        // Arrange the rules into sections
        sections = [];
        arrange_by_path = $('#arrange-by-path-radio-button').is(':checked');
        $.each(rules, function (index, rule) {
            var section_name = '';
            // Determine the section name based on the user's
            // "arrange by" selection
            if (arrange_by_path) {
                section_name = getFullPath(rule);
            } else {
                section_name = getDisplayName(rule);
            }

            // Determine if the section already exists
            existing_section = null;
            $.each(sections, function (index, section) {
                if (section.name === section_name) {
                    existing_section = section;
                    return false;
                }
            });
            // If it does, add the rule
            if (existing_section !== null) {
                existing_section.rules.push(rule);
            } else {
                // If it doesn't, create a new section and add the rule
                new_section = {};
                new_section.name = section_name;
                new_section.rules = [];
                new_section.rules.push(rule);
                sections.push(new_section);
            }
        });

        // Loop through the sections to construct the table
        $.each(sections, function (index, section) {
            var section_body, header_row;
            // Create a tbody
            section_body = $('<tbody></tbody>');
            // Create the header row
            header_row = $('<tr class="header-row">' +
                '<td><input type="checkbox" class="select-all-checkbox" />' +
                '</td>' +
                '<td class="fill-column"><span>' + section.name +
                '</span><a class="new-link">New</a>' + '</td>' +
                '<td class="checkbox-column">Read</td>' +
                '<td class="checkbox-column">Write</td>' +
                '</tr>');

            // Store data about the section with the header row
            // (for use by "new" links)
            if ($('#arrange-by-path-radio-button').is(':checked')) {
                header_row.data('repo', section.rules[0].repo);
                header_row.data('path', section.rules[0].path);
            } else {
                header_row.data('name_type', section.rules[0].name_type);
                header_row.data('name', section.rules[0].name);
            }
            section_body.append(header_row);

            // Create a row for each rule
            $.each(section.rules, function (index, rule) {
                // Assign a name to display depending on arrange by preference
                var rule_name = '', read, write, read_checkbox, write_checkbox,
                    rule_class, checkbox_icon, table_row;
                if ($('#arrange-by-path-radio-button').is(':checked')) {
                    rule_name = getDisplayName(rule);
                } else {
                    rule_name = getFullPath(rule);
                }

                if (rule.permissions === R) {
                    read = true;
                    write = false;
                } else if (rule.permissions === RW) {
                    read = true;
                    write = true;
                } else {
                    read = false;
                    write = false;
                }

                // These checkboxes are purely representational --
                // they represent the read or write
                // permissions for the rule and cannot be changed
                // in the web interface. That is why
                // They are images instead of HTML form checkboxes.
                read_checkbox = (read ?
                        '<img src="images/checkbox_checked.png" alt="Read" ' +
                            'title="Read" />' :
                        '<img src="images/checkbox_empty.png" alt="No read" ' +
                            'title="No read" />');
                write_checkbox = (write ?
                        '<img src="images/checkbox_checked.png" alt="Write" ' +
                            'title="Write" />' :
                        '<img src="images/checkbox_empty.png" alt="No write" ' +
                            'title="No write" />');

                // Add background color and show an appropriate icon
                // if the rule is pending addition or deletion,
                // or a checkbox if the rule is up-to-date.
                rule_class = '';
                checkbox_icon = '';
                if (rule.added) {
                    rule_class = 'added-rule';
                    checkbox_icon =
                            '<img src="images/plus.png" alt="Added" ' +
                                'title="Added" />';
                } else if (rule.deleted) {
                    rule_class = 'deleted-rule';
                    checkbox_icon =
                            '<img src="images/minus.png" alt="Deleted" ' +
                                'title="Deleted" />';
                } else {
                    checkbox_icon = '<input type="checkbox" />';
                }

                table_row = $('<tr class=' + rule_class + '>' +
                    '<td>' + checkbox_icon + '</td>' +
                    '<td class="fill-column">' + rule_name + '</td>' +
                    '<td class="checkbox-column">' + read_checkbox + '</td>' +
                    '<td class="checkbox-column">' + write_checkbox + '</td>' +
                    '</tr>');

                // Scroll to the newest changed rule after showing rules
                if ((rule.added || rule.deleted) && !scroll_here) {
                    scroll_here = table_row;
                }

                section_body.append(table_row);
            });

            $('#rules-table').append(section_body);
        });

        // Add click event for "check all" (at the top of each section) to work
        $(".select-all-checkbox").click(function () {
            var to_change;
            if (this.checked) {
                to_change = $(this).closest('tbody').find(
                    ':checkbox:not(:checked)'
                );
                $(to_change).prop('checked', true);
                checked_count += to_change.length;
            } else {
                to_change = $(this).closest('tbody').find(':checkbox:checked');
                $(to_change).prop('checked', false);
                checked_count -= to_change.length;
            }

            refreshButtons();
        });

        $('#rules-section input[type=checkbox]:not(.select-all-checkbox)')
            .click(function () {
                // Uncheck select-all checkbox if any checkbox in
                // its section is clicked
                $(this).closest('tbody').find('.select-all-checkbox').prop(
                    'checked',
                    false
                );

                // Only show the edit, copy, and delete buttons when 
                // something is checked
                if ($(this).is(':checked')) {
                    checked_count += 1;
                } else {
                    checked_count -= 1;
                }

                refreshButtons();
            });

        $('.new-link').hide().click(function () {
            var header_row = $(this).closest('tr');
            if ($('#arrange-by-path-radio-button').is(':checked')) {
                // We know which path the new rule is for, but not which user
                $('#repos-dropdown').val(header_row.data('repo'));
                $('#path-input').val(header_row.data('path'));
                repoChanged();
            } else {
                // We know which user the new rule is for, but not which path
                // By default, pick "All"
                $('#all-radio-button').prop('checked', 'checked');
                $('#user-radio-button').prop('checked', (header_row.data(
                    'name_type'
                ) === USER
                ));
                $('#group-radio-button').prop('checked', (header_row.data(
                    'name_type'
                ) === GROUP
                ));
                updateUsersGroups();
                $('#users-groups-dropdown').val(header_row.data('name'));
            }
            showNewRuleForm();
        });

        $('.header-row').hover(function () {
            $(this).find('.new-link').show();
        }, function () {
            $(this).find('.new-link').hide();
        });

        // Processing complete, show rules section.
        $('#rules-section').show().animate({
            opacity: 1
        }, 'slow');

        if (scroll_here) {
            scroll_here[0].scrollIntoView(true);
        }
    };

    refreshButtons = function () {
        if (checked_count > 0) {
            $('.selection-only-button').show();
        } else {
            $('.selection-only-button').hide();
        }
    };

    getDisplayName = function (rule) {
        var name_type_image, name;
        if (rule.name_type === USER) {
            name_type_image =
                '<img src="images/user.png" class="name-type-icon" ' +
                    'alt="User" title="User" />';
        } else if (rule.name_type === GROUP) {
            name_type_image =
                '<img src="images/group.png" class="name-type-icon" ' +
                    'alt="Group" title="Group" />';
        } else {
            name_type_image =
                '<img src="images/asterisk.png" class="name-type-icon" ' +
                    'alt="All" title="All" />';
        }

        name = (rule.name_type === ALL ? 'All users' : rule.name);

        return name_type_image + name;
    };

    getFullPath = function (rule) {
        var full_path = '';
        if (rule.repo === '/') {
            full_path = rule.repo;
        } else if (rule.path === '') {
            full_path = rule.repo + ':/';
        } else {
            full_path = rule.repo + ':' + rule.path;
        }

        return full_path;
    };

    displayError = function (error) {
        alert(error +
            ' Please send a message to ' + settings.admin_email +
                ' for assistance.');
    };
}());
