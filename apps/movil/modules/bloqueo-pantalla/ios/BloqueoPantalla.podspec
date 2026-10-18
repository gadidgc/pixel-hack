Pod::Spec.new do |s|
  s.name           = 'BloqueoPantalla'
  s.version        = '1.0.0'
  s.summary        = 'Bloqueo de apps con Tiempo de uso ante un arrebato'
  s.description    = 'En iPhone pone un escudo de Tiempo de uso sobre las demás apps al confirmar un arrebato.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'FamilyControls', 'ManagedSettings', 'LocalAuthentication'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
