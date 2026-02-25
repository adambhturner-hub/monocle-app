use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tauri::command]
fn hide_window(window: tauri::Window) {
    window.hide().unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let toggle_shortcut = Shortcut::new(Some(Modifiers::ALT), Code::KeyC);

  tauri::Builder::default()
    .plugin(
      tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
          if shortcut == &toggle_shortcut && event.state() == ShortcutState::Pressed {
            if let Some(window) = app.get_webview_window("main") {
              let is_visible = window.is_visible().unwrap_or(false);
              if is_visible {
                window.hide().unwrap();
              } else {
                window.show().unwrap();
                window.set_focus().unwrap();
              }
            }
          }
        })
        .build(),
    )
    .setup(move |app| {
      #[cfg(desktop)]
      {
        app.global_shortcut().register(toggle_shortcut)?;
      }
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![hide_window])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
