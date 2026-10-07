#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{thread, time::Duration};
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use url::Url;

const APP_URL: &str = "https://redshadowprojects.vercel.app/";
const WINDOW_LABEL: &str = "main";

fn workspace_url() -> &'static str {
    if cfg!(debug_assertions) {
        "http://127.0.0.1:3000/"
    } else {
        APP_URL
    }
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        if let Err(error) = window.show() {
            eprintln!("Could not show the main window: {error}");
        }
        if let Err(error) = window.unminimize() {
            eprintln!("Could not restore the main window: {error}");
        }
        if let Err(error) = window.set_focus() {
            eprintln!("Could not focus the main window: {error}");
        }
    }
}

fn handle_tray_action(app: &AppHandle, id: &str) {
    match id {
        "open" => focus_main_window(app),
        "notifications" | "logout" => {
            focus_main_window(app);
            if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
                let script = if id == "notifications" {
                    "window.dispatchEvent(new Event('redshadow:open-notifications'))"
                } else {
                    "window.dispatchEvent(new Event('redshadow:logout'))"
                };
                if let Err(error) = window.eval(script) {
                    eprintln!("Could not send the tray action to the app: {error}");
                }
            }
        }
        "exit" => app.exit(0),
        _ => {}
    }
}

fn offline_url() -> &'static str {
    if cfg!(target_os = "windows") {
        "http://tauri.localhost/index.html"
    } else {
        "tauri://localhost/index.html"
    }
}

fn monitor_connection(window: WebviewWindow) {
    thread::spawn(move || {
        let client = match reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(8))
            .build()
        {
            Ok(client) => client,
            Err(error) => {
                eprintln!("Could not create the desktop connection checker: {error}");
                return;
            }
        };
        let mut was_online = false;

        loop {
            let online = match client.head(workspace_url()).send() {
                Ok(response) => response.status().is_success(),
                Err(error) => {
                    if was_online {
                        eprintln!("Red Shadow Projects became unreachable: {error}");
                    }
                    false
                }
            };

            if online != was_online {
                let restore_window = match window.is_visible() {
                    Ok(visible) => visible,
                    Err(error) => {
                        eprintln!("Could not read desktop window visibility: {error}");
                        false
                    }
                };
                let target = if online {
                    workspace_url()
                } else {
                    offline_url()
                };
                match target.parse::<Url>() {
                    Ok(url) => {
                        if let Err(error) = window.navigate(url) {
                            eprintln!("Could not change the desktop connection screen: {error}");
                        } else if online && restore_window {
                            if let Err(error) = window.show() {
                                eprintln!("Could not show the connected app: {error}");
                            }
                        }
                    }
                    Err(error) => eprintln!("Invalid desktop navigation URL: {error}"),
                }
                was_online = online;
            }

            thread::sleep(Duration::from_secs(15));
        }
    });
}

fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(|app| {
            let start_hidden = std::env::args().any(|argument| argument == "--minimized");
            let window = app
                .get_webview_window(WINDOW_LABEL)
                .ok_or_else(|| {
                    std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "The desktop window could not be created",
                    )
                })?;

            #[cfg(all(windows, not(debug_assertions)))]
            {
                use tauri_plugin_autostart::ManagerExt;
                if let Err(error) = app.autolaunch().enable() {
                    eprintln!("Could not enable Windows startup launch: {error}");
                }
            }

            let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
            let notifications =
                MenuItem::with_id(app, "notifications", "Notifications", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let logout = MenuItem::with_id(app, "logout", "Logout", true, None::<&str>)?;
            let exit = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[&open, &notifications, &separator, &logout, &exit],
            )?;
            let icon = app
                .default_window_icon()
                .cloned()
                .ok_or_else(|| {
                    std::io::Error::new(
                        std::io::ErrorKind::NotFound,
                        "A Windows app icon is required",
                    )
                })?;
            let tray = TrayIconBuilder::new()
                .icon(icon)
                .tooltip("Red Shadow Projects")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| handle_tray_action(app, event.id.0.as_str()))
                .build(app)?;
            app.manage(tray);

            if start_hidden {
                if let Err(error) = window.hide() {
                    eprintln!("Could not start minimized to the system tray: {error}");
                }
            }
            monitor_connection(window);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Err(error) = window.hide() {
                    eprintln!("Could not minimize the window to the tray: {error}");
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Could not run Red Shadow Projects Desktop");
}

fn main() {
    run();
}
